import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import Stripe from "stripe";

const app = new Hono<{ Bindings: Env }>();

// Helper to get Stripe instance
function getStripe(env: Env) {
  return new Stripe(env.STRIPE_SECRET_KEY);
}

// ==================== AUTH ENDPOINTS ====================

// Get OAuth redirect URL for Google login
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

// Exchange OAuth code for session token
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

// Admin email - automatically granted admin access
const ADMIN_EMAIL = "hassan.lakis92@gmail.com";

// Get current user
app.get("/api/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  
  // Also get or create user profile with membership tier
  const db = c.env.DB;
  let profile = await db.prepare(
    "SELECT * FROM user_profiles WHERE user_id = ?"
  ).bind(user!.id).first();

  // Check if this user should be admin
  const shouldBeAdmin = user!.email === ADMIN_EMAIL;

  if (!profile) {
    // Create profile with free tier for new users
    await db.prepare(
      "INSERT INTO user_profiles (user_id, membership_tier, is_admin) VALUES (?, 'free', ?)"
    ).bind(user!.id, shouldBeAdmin ? 1 : 0).run();
    profile = { membership_tier: "free", is_admin: shouldBeAdmin ? 1 : 0 };
  } else if (shouldBeAdmin && !profile.is_admin) {
    // Ensure admin email always has admin access
    await db.prepare(
      "UPDATE user_profiles SET is_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
    ).bind(user!.id).run();
    profile = { ...profile, is_admin: 1 };
  }

  return c.json({
    ...user,
    membership_tier: profile.membership_tier,
  });
});

// Logout
app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// ==================== LOCATIONS ENDPOINTS ====================

// GET /api/locations - List all locations with pod counts
app.get("/api/locations", async (c) => {
  const db = c.env.DB;
  
  const locations = await db.prepare(`
    SELECT 
      l.*,
      COUNT(p.id) as pod_count,
      COUNT(CASE WHEN p.is_out_of_service = 0 THEN 1 END) as available_pod_count
    FROM locations l
    LEFT JOIN pods p ON p.location_id = l.id
    GROUP BY l.id
    ORDER BY l.name
  `).all();

  return c.json(locations.results);
});

// GET /api/locations/:slug - Get single location with all pods
app.get("/api/locations/:slug", async (c) => {
  const db = c.env.DB;
  const slug = c.req.param("slug");

  const location = await db.prepare(`
    SELECT * FROM locations WHERE slug = ?
  `).bind(slug).first();

  if (!location) {
    return c.json({ error: "Location not found" }, 404);
  }

  const pods = await db.prepare(`
    SELECT * FROM pods WHERE location_id = ? ORDER BY name
  `).bind(location.id).all();

  return c.json({
    ...location,
    pods: pods.results.map((pod: any) => ({
      ...pod,
      amenities: pod.amenities ? JSON.parse(pod.amenities) : [],
      is_out_of_service: Boolean(pod.is_out_of_service),
    })),
  });
});

// GET /api/pods/:id - Get single pod with location info
app.get("/api/pods/:id", async (c) => {
  const db = c.env.DB;
  const podId = c.req.param("id");

  const result = await db.prepare(`
    SELECT 
      p.*,
      l.name as location_name,
      l.slug as location_slug,
      l.address as location_address,
      l.city as location_city,
      l.state as location_state
    FROM pods p
    JOIN locations l ON l.id = p.location_id
    WHERE p.id = ?
  `).bind(podId).first();

  if (!result) {
    return c.json({ error: "Pod not found" }, 404);
  }

  return c.json({
    ...result,
    amenities: result.amenities ? JSON.parse(result.amenities as string) : [],
    is_out_of_service: Boolean(result.is_out_of_service),
  });
});

// ==================== BOOKING ENDPOINTS ====================

// GET /api/pods/:id/availability - Get bookings for a pod on a specific date
app.get("/api/pods/:id/availability", async (c) => {
  const db = c.env.DB;
  const podId = c.req.param("id");
  const date = c.req.query("date"); // YYYY-MM-DD format

  if (!date) {
    return c.json({ error: "Date parameter required" }, 400);
  }

  // Get all confirmed/pending bookings for this pod on this date
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const bookings = await db.prepare(`
    SELECT start_time, end_time 
    FROM bookings 
    WHERE pod_id = ? 
      AND status IN ('pending', 'confirmed')
      AND start_time >= ? 
      AND start_time <= ?
    ORDER BY start_time
  `).bind(podId, startOfDay, endOfDay).all();

  return c.json({
    date,
    booked_slots: bookings.results.map((b: any) => ({
      start: b.start_time,
      end: b.end_time,
    })),
  });
});

// POST /api/bookings - Create a new booking
app.post("/api/bookings", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.env.DB;
  const body = await c.req.json();

  const { pod_id, start_time, end_time, duration, actual_minutes } = body;

  if (!pod_id || !start_time || !end_time || !duration) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Verify pod exists and is available
  const pod = await db.prepare(
    "SELECT * FROM pods WHERE id = ? AND is_out_of_service = 0"
  ).bind(pod_id).first();

  if (!pod) {
    return c.json({ error: "Pod not found or out of service" }, 404);
  }

  // Check for conflicting bookings
  const conflict = await db.prepare(`
    SELECT id FROM bookings 
    WHERE pod_id = ? 
      AND status IN ('pending', 'confirmed')
      AND (
        (start_time < ? AND end_time > ?)
        OR (start_time < ? AND end_time > ?)
        OR (start_time >= ? AND end_time <= ?)
      )
    LIMIT 1
  `).bind(
    pod_id,
    end_time, start_time,
    end_time, start_time,
    start_time, end_time
  ).first();

  if (conflict) {
    return c.json({ error: "Time slot is already booked" }, 409);
  }

  // Get user's membership tier for discount
  const profile = await db.prepare(
    "SELECT membership_tier FROM user_profiles WHERE user_id = ?"
  ).bind(user.id).first();

  const membershipTier = (profile?.membership_tier as string) || "free";
  
  // Fetch discount from membership_settings table
  const discountSetting = await db.prepare(
    "SELECT discount_percent FROM membership_settings WHERE tier = ?"
  ).bind(membershipTier).first();
  
  const discountPercent = (discountSetting?.discount_percent as number) || 0;
  
  // Calculate price - use actual_minutes for prorated pricing if provided
  const pricePerMinute = (pod.price_per_hour as number) / 60;
  const billableMinutes = actual_minutes || (duration * 60);
  const priceBase = pricePerMinute * billableMinutes;
  const priceFinal = priceBase * (1 - discountPercent / 100);

  // Create the booking
  const result = await db.prepare(`
    INSERT INTO bookings (
      user_id, pod_id, start_time, end_time, 
      status, price_base, discount_percent, price_final, payment_status
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, 'unpaid')
  `).bind(
    user.id,
    pod_id,
    start_time,
    end_time,
    priceBase,
    discountPercent,
    priceFinal
  ).run();

  const bookingId = result.meta.last_row_id;

  return c.json({
    id: bookingId,
    pod_id,
    start_time,
    end_time,
    status: "pending",
    price_base: priceBase,
    discount_percent: discountPercent,
    price_final: priceFinal,
    payment_status: "unpaid",
  }, 201);
});

// GET /api/bookings - Get current user's bookings
app.get("/api/bookings", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.env.DB;

  const bookings = await db.prepare(`
    SELECT 
      b.*,
      p.name as pod_name,
      p.type as pod_type,
      p.image_url as pod_image_url,
      l.name as location_name,
      l.slug as location_slug,
      l.address as location_address,
      l.city as location_city
    FROM bookings b
    JOIN pods p ON p.id = b.pod_id
    JOIN locations l ON l.id = p.location_id
    WHERE b.user_id = ?
    ORDER BY b.start_time DESC
  `).bind(user.id).all();

  return c.json(bookings.results);
});

// GET /api/bookings/:id - Get a specific booking
app.get("/api/bookings/:id", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.env.DB;
  const bookingId = c.req.param("id");

  const booking = await db.prepare(`
    SELECT 
      b.*,
      p.name as pod_name,
      p.type as pod_type,
      p.image_url as pod_image_url,
      p.amenities as pod_amenities,
      l.name as location_name,
      l.slug as location_slug,
      l.address as location_address,
      l.city as location_city,
      l.state as location_state
    FROM bookings b
    JOIN pods p ON p.id = b.pod_id
    JOIN locations l ON l.id = p.location_id
    WHERE b.id = ? AND b.user_id = ?
  `).bind(bookingId, user.id).first();

  if (!booking) {
    return c.json({ error: "Booking not found" }, 404);
  }

  return c.json({
    ...booking,
    pod_amenities: booking.pod_amenities ? JSON.parse(booking.pod_amenities as string) : [],
  });
});

// ==================== STRIPE PAYMENT ENDPOINTS ====================

// GET /api/membership-tiers - Get all membership tier info for upgrade UI
app.get("/api/membership-tiers", async (c) => {
  const db = c.env.DB;
  const settings = await db.prepare(
    "SELECT tier, discount_percent, description, monthly_price FROM membership_settings ORDER BY monthly_price ASC"
  ).all();
  return c.json(settings.results);
});

// POST /api/membership/upgrade - Create a Stripe checkout session for membership upgrade
app.post("/api/membership/upgrade", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.env.DB;
  const body = await c.req.json();
  const { tier } = body;

  if (!tier || !["plus", "pro"].includes(tier)) {
    return c.json({ error: "Invalid tier" }, 400);
  }

  // Get current user's membership
  const profile = await db.prepare(
    "SELECT membership_tier FROM user_profiles WHERE user_id = ?"
  ).bind(user.id).first();
  
  const currentTier = (profile?.membership_tier as string) || "free";
  
  // Check if this is actually an upgrade
  const tierOrder = { free: 0, plus: 1, pro: 2 };
  if (tierOrder[tier as keyof typeof tierOrder] <= tierOrder[currentTier as keyof typeof tierOrder]) {
    return c.json({ error: "Cannot downgrade or select same tier" }, 400);
  }

  // Get tier pricing
  const tierSettings = await db.prepare(
    "SELECT monthly_price, description FROM membership_settings WHERE tier = ?"
  ).bind(tier).first();

  if (!tierSettings || (tierSettings.monthly_price as number) <= 0) {
    return c.json({ error: "Invalid tier pricing" }, 400);
  }

  const stripe = getStripe(c.env);
  const origin = new URL(c.req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Capsule Pod ${tier.charAt(0).toUpperCase() + tier.slice(1)} Membership`,
            description: tierSettings.description as string,
          },
          unit_amount: tierSettings.monthly_price as number,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/profile?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/profile?upgrade=cancelled`,
    metadata: {
      type: "membership_upgrade",
      user_id: user.id,
      new_tier: tier,
    },
  });

  return c.json({ url: session.url });
});

// POST /api/membership/verify - Verify and complete a membership upgrade
app.post("/api/membership/verify", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.env.DB;
  const stripe = getStripe(c.env);
  const body = await c.req.json();
  const { session_id } = body;

  if (!session_id) {
    return c.json({ error: "Session ID required" }, 400);
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Verify the session is for this user and is a membership upgrade
    if (
      session.metadata?.type !== "membership_upgrade" ||
      session.metadata?.user_id !== user.id
    ) {
      return c.json({ error: "Invalid session" }, 400);
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return c.json({ error: "Payment not completed" }, 400);
    }

    const newTier = session.metadata.new_tier;

    // Update the user's membership tier
    await db.prepare(`
      UPDATE user_profiles 
      SET membership_tier = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `).bind(newTier, user.id).run();

    return c.json({ success: true, tier: newTier });
  } catch (err) {
    console.error("Membership verification failed:", err);
    return c.json({ error: "Verification failed" }, 500);
  }
});

// POST /api/checkout - Create a Stripe checkout session for a booking
app.post("/api/checkout", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.env.DB;
  const body = await c.req.json();
  const { booking_id } = body;

  if (!booking_id) {
    return c.json({ error: "Booking ID required" }, 400);
  }

  // Get booking details
  const booking = await db.prepare(`
    SELECT 
      b.*,
      p.name as pod_name,
      l.name as location_name
    FROM bookings b
    JOIN pods p ON p.id = b.pod_id
    JOIN locations l ON l.id = p.location_id
    WHERE b.id = ? AND b.user_id = ?
  `).bind(booking_id, user.id).first();

  if (!booking) {
    return c.json({ error: "Booking not found" }, 404);
  }

  if (booking.status !== "pending" || booking.payment_status !== "unpaid") {
    return c.json({ error: "Booking is not awaiting payment" }, 400);
  }

  const stripe = getStripe(c.env);

  // Calculate duration for description
  const startTime = new Date(booking.start_time as string);
  const endTime = new Date(booking.end_time as string);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
  const dateStr = startTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Get the origin from the request
  const origin = new URL(c.req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${booking.pod_name} - ${booking.location_name}`,
            description: `${dateStr} at ${timeStr} (${duration} hour${duration !== 1 ? "s" : ""})`,
          },
          unit_amount: Math.round((booking.price_final as number) * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/bookings/${booking_id}?payment=success`,
    cancel_url: `${origin}/bookings/${booking_id}?payment=cancelled`,
    metadata: {
      booking_id: String(booking_id),
      user_id: user.id,
    },
  });

  // Store the Stripe session ID on the booking
  await db.prepare(
    "UPDATE bookings SET stripe_session_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(session.id, booking_id).run();

  return c.json({ url: session.url });
});

// POST /api/webhooks/stripe - Handle Stripe webhooks
app.post("/api/webhooks/stripe", async (c) => {
  const stripe = getStripe(c.env);
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return c.text("Invalid signature", 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const db = c.env.DB;

    // Handle membership upgrades
    if (session.metadata?.type === "membership_upgrade") {
      const userId = session.metadata.user_id;
      const newTier = session.metadata.new_tier;

      if (userId && newTier) {
        await db.prepare(`
          UPDATE user_profiles 
          SET membership_tier = ?, 
              updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = ?
        `).bind(newTier, userId).run();

        console.log(`User ${userId} upgraded to ${newTier} membership`);
      }
    }
    
    // Handle booking payments
    const bookingId = session.metadata?.booking_id;
    if (bookingId) {
      // Generate a unique QR token for access
      const qrToken = crypto.randomUUID();

      // Update booking to confirmed and paid
      await db.prepare(`
        UPDATE bookings 
        SET status = 'confirmed', 
            payment_status = 'paid', 
            qr_token = ?,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(qrToken, bookingId).run();

      console.log(`Booking ${bookingId} confirmed with QR token`);
    }
  }

  return c.text("ok", 200);
});

// ==================== ADMIN ENDPOINTS ====================

// Admin middleware - checks if user is admin
const adminMiddleware = async (c: any, next: any) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.env.DB;
  const profile = await db.prepare(
    "SELECT is_admin FROM user_profiles WHERE user_id = ?"
  ).bind(user.id).first();

  if (!profile || !profile.is_admin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
};

// Check if current user is admin
app.get("/api/admin/check", authMiddleware, async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  
  const profile = await db.prepare(
    "SELECT is_admin FROM user_profiles WHERE user_id = ?"
  ).bind(user!.id).first();

  return c.json({ isAdmin: profile?.is_admin === 1 });
});

// Get all locations with pod counts (admin)
app.get("/api/admin/locations", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const locations = await db.prepare(`
    SELECT l.*, COUNT(p.id) as pod_count 
    FROM locations l 
    LEFT JOIN pods p ON l.id = p.location_id 
    GROUP BY l.id 
    ORDER BY l.name ASC
  `).all();
  return c.json({ locations: locations.results || [] });
});

// Create location (admin)
app.post("/api/admin/locations", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();

  const { name, slug, address, city, state, lat, lng, image_url, description, open_hours } = body;

  if (!name || !slug || !address || !city || lat === undefined || lng === undefined) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Check slug uniqueness
  const existing = await db.prepare("SELECT id FROM locations WHERE slug = ?").bind(slug).first();
  if (existing) {
    return c.json({ error: "A location with this slug already exists" }, 400);
  }

  const result = await db.prepare(`
    INSERT INTO locations (name, slug, address, city, state, lat, lng, image_url, description, open_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(name, slug, address, city, state || "MN", lat, lng, image_url, description, open_hours).run();

  return c.json({ id: result.meta.last_row_id, success: true });
});

// Update location (admin)
app.put("/api/admin/locations/:id", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();

  const { name, slug, address, city, state, lat, lng, image_url, description, open_hours } = body;

  if (!name || !slug || !address || !city || lat === undefined || lng === undefined) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Check slug uniqueness (excluding current)
  const existing = await db.prepare(
    "SELECT id FROM locations WHERE slug = ? AND id != ?"
  ).bind(slug, id).first();
  if (existing) {
    return c.json({ error: "A location with this slug already exists" }, 400);
  }

  await db.prepare(`
    UPDATE locations 
    SET name = ?, slug = ?, address = ?, city = ?, state = ?, lat = ?, lng = ?, 
        image_url = ?, description = ?, open_hours = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name, slug, address, city, state || "MN", lat, lng, image_url, description, open_hours, id).run();

  return c.json({ success: true });
});

// Delete location (admin)
app.delete("/api/admin/locations/:id", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");

  // Check if location has pods
  const pods = await db.prepare("SELECT COUNT(*) as count FROM pods WHERE location_id = ?").bind(id).first();
  if (pods && (pods.count as number) > 0) {
    return c.json({ error: "Cannot delete location with existing pods. Remove pods first." }, 400);
  }

  await db.prepare("DELETE FROM locations WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Get all pods with location info (admin)
app.get("/api/admin/pods", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const pods = await db.prepare(`
    SELECT p.*, l.name as location_name, l.city as location_city 
    FROM pods p 
    JOIN locations l ON p.location_id = l.id 
    ORDER BY l.name ASC, p.name ASC
  `).all();
  return c.json({ pods: pods.results || [] });
});

// Create pod (admin)
app.post("/api/admin/pods", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();

  const { location_id, name, slug, type, price_per_hour, amenities, image_url, is_out_of_service } = body;

  if (!location_id || !name || !slug || price_per_hour === undefined) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Check slug uniqueness within location
  const existing = await db.prepare(
    "SELECT id FROM pods WHERE location_id = ? AND slug = ?"
  ).bind(location_id, slug).first();
  if (existing) {
    return c.json({ error: "A pod with this slug already exists at this location" }, 400);
  }

  const result = await db.prepare(`
    INSERT INTO pods (location_id, name, slug, type, price_per_hour, amenities, image_url, is_out_of_service)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(location_id, name, slug, type || "standard", price_per_hour, amenities, image_url, is_out_of_service || 0).run();

  return c.json({ id: result.meta.last_row_id, success: true });
});

// Update pod (admin)
app.put("/api/admin/pods/:id", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();

  const { location_id, name, slug, type, price_per_hour, amenities, image_url, is_out_of_service } = body;

  if (!location_id || !name || !slug || price_per_hour === undefined) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Check slug uniqueness within location (excluding current pod)
  const existing = await db.prepare(
    "SELECT id FROM pods WHERE location_id = ? AND slug = ? AND id != ?"
  ).bind(location_id, slug, id).first();
  if (existing) {
    return c.json({ error: "A pod with this slug already exists at this location" }, 400);
  }

  await db.prepare(`
    UPDATE pods 
    SET location_id = ?, name = ?, slug = ?, type = ?, price_per_hour = ?, 
        amenities = ?, image_url = ?, is_out_of_service = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(location_id, name, slug, type || "standard", price_per_hour, amenities, image_url, is_out_of_service || 0, id).run();

  return c.json({ success: true });
});

// Toggle pod status (admin)
app.patch("/api/admin/pods/:id/status", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const { is_out_of_service } = await c.req.json();

  await db.prepare(`
    UPDATE pods SET is_out_of_service = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(is_out_of_service, id).run();

  return c.json({ success: true });
});

// Delete pod (admin)
app.delete("/api/admin/pods/:id", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");

  // Check if pod has active bookings
  const bookings = await db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE pod_id = ? AND status IN ('pending', 'confirmed')"
  ).bind(id).first();
  if (bookings && (bookings.count as number) > 0) {
    return c.json({ error: "Cannot delete pod with active bookings" }, 400);
  }

  await db.prepare("DELETE FROM pods WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Get all bookings with user/pod/location info (admin)
app.get("/api/admin/bookings", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const bookings = await db.prepare(`
    SELECT 
      b.*,
      p.name as pod_name,
      p.location_id,
      l.name as location_name
    FROM bookings b
    JOIN pods p ON b.pod_id = p.id
    JOIN locations l ON p.location_id = l.id
    ORDER BY b.created_at DESC
  `).all();

  // Get user emails from user service
  const bookingsWithEmails = await Promise.all(
    (bookings.results || []).map(async (booking: any) => {
      try {
        const userRes = await fetch(
          `${c.env.MOCHA_USERS_SERVICE_API_URL}/api/users/${booking.user_id}`,
          { headers: { "X-API-Key": c.env.MOCHA_USERS_SERVICE_API_KEY } }
        );
        if (userRes.ok) {
          const userData = (await userRes.json()) as { email?: string };
          return { ...booking, user_email: userData.email };
        }
      } catch {}
      return { ...booking, user_email: null };
    })
  );

  return c.json({ bookings: bookingsWithEmails });
});

// Cancel booking (admin)
app.post("/api/admin/bookings/:id/cancel", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");

  // Get booking
  const booking = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(id).first();
  if (!booking) {
    return c.json({ error: "Booking not found" }, 404);
  }

  if (booking.status === "cancelled") {
    return c.json({ error: "Booking is already cancelled" }, 400);
  }

  // Update status to cancelled
  await db.prepare(`
    UPDATE bookings 
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(id).run();

  return c.json({ success: true });
});

// Get admin dashboard stats
app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;

  // Get location count
  const locationsResult = await db.prepare("SELECT COUNT(*) as count FROM locations").first();
  const totalLocations = (locationsResult?.count as number) || 0;

  // Get pod counts
  const podsResult = await db.prepare("SELECT COUNT(*) as count FROM pods").first();
  const totalPods = (podsResult?.count as number) || 0;

  const outOfServiceResult = await db.prepare(
    "SELECT COUNT(*) as count FROM pods WHERE is_out_of_service = 1"
  ).first();
  const podsOutOfService = (outOfServiceResult?.count as number) || 0;

  // Get booking counts
  const bookingsResult = await db.prepare("SELECT COUNT(*) as count FROM bookings").first();
  const totalBookings = (bookingsResult?.count as number) || 0;

  const pendingResult = await db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'"
  ).first();
  const pendingBookings = (pendingResult?.count as number) || 0;

  const confirmedResult = await db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'"
  ).first();
  const confirmedBookings = (confirmedResult?.count as number) || 0;

  const cancelledResult = await db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'"
  ).first();
  const cancelledBookings = (cancelledResult?.count as number) || 0;

  // Get member counts
  const membersResult = await db.prepare("SELECT COUNT(*) as count FROM user_profiles").first();
  const totalMembers = (membersResult?.count as number) || 0;

  const freeResult = await db.prepare(
    "SELECT COUNT(*) as count FROM user_profiles WHERE membership_tier = 'free'"
  ).first();
  const freeTier = (freeResult?.count as number) || 0;

  const plusResult = await db.prepare(
    "SELECT COUNT(*) as count FROM user_profiles WHERE membership_tier = 'plus'"
  ).first();
  const plusTier = (plusResult?.count as number) || 0;

  const proResult = await db.prepare(
    "SELECT COUNT(*) as count FROM user_profiles WHERE membership_tier = 'pro'"
  ).first();
  const proTier = (proResult?.count as number) || 0;

  // Get total revenue
  const revenueResult = await db.prepare(
    "SELECT COALESCE(SUM(price_final), 0) as total FROM bookings WHERE payment_status = 'paid'"
  ).first();
  const totalRevenue = (revenueResult?.total as number) || 0;

  // Get recent bookings with pod and location info
  const recentBookings = await db.prepare(`
    SELECT 
      b.id, b.user_id, b.start_time, b.status, b.price_final,
      p.name as pod_name, l.name as location_name
    FROM bookings b
    JOIN pods p ON b.pod_id = p.id
    JOIN locations l ON p.location_id = l.id
    ORDER BY b.created_at DESC
    LIMIT 10
  `).all();

  return c.json({
    totalLocations,
    totalPods,
    podsOutOfService,
    totalBookings,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,
    totalMembers,
    membersByTier: {
      free: freeTier,
      plus: plusTier,
      pro: proTier,
    },
    totalRevenue,
    recentBookings: recentBookings.results || [],
  });
});

// Get all members with booking stats
app.get("/api/admin/members", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;

  const profiles = await db
    .prepare(
      `SELECT up.*, 
        (SELECT COUNT(*) FROM bookings WHERE user_id = up.user_id) as booking_count,
        (SELECT COALESCE(SUM(price_final), 0) FROM bookings WHERE user_id = up.user_id AND payment_status = 'paid') as total_spent
      FROM user_profiles up
      ORDER BY up.created_at DESC`
    )
    .all();

  // Fetch emails from Mocha users service
  const membersWithEmails = await Promise.all(
    (profiles.results || []).map(async (profile: any) => {
      try {
        const userRes = await fetch(
          `${c.env.MOCHA_USERS_SERVICE_API_URL}/api/users/${profile.user_id}`,
          { headers: { "X-API-Key": c.env.MOCHA_USERS_SERVICE_API_KEY } }
        );
        if (userRes.ok) {
          const userData = (await userRes.json()) as { email?: string };
          return { ...profile, email: userData.email || "Unknown" };
        }
      } catch {}
      return { ...profile, email: "Unknown" };
    })
  );

  return c.json({ members: membersWithEmails });
});

// Get member's booking history
app.get("/api/admin/members/:userId/bookings", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.req.param("userId");
  const db = c.env.DB;

  const bookings = await db
    .prepare(
      `SELECT b.*, p.name as pod_name, l.name as location_name
      FROM bookings b
      JOIN pods p ON b.pod_id = p.id
      JOIN locations l ON p.location_id = l.id
      WHERE b.user_id = ?
      ORDER BY b.start_time DESC`
    )
    .bind(userId)
    .all();

  return c.json({ bookings: bookings.results || [] });
});

// Update member (tier, admin status)
app.put("/api/admin/members/:userId", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.req.param("userId");
  const { membership_tier, is_admin } = await c.req.json();
  const db = c.env.DB;

  await db
    .prepare(
      `UPDATE user_profiles SET membership_tier = ?, is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    )
    .bind(membership_tier, is_admin ? 1 : 0, userId)
    .run();

  return c.json({ success: true });
});

// Get membership settings
app.get("/api/admin/membership-settings", authMiddleware, adminMiddleware, async (c) => {
  const db = c.env.DB;
  const settings = await db.prepare("SELECT * FROM membership_settings ORDER BY id").all();
  return c.json(settings.results || []);
});

// Update membership setting by tier
app.put("/api/admin/membership-settings/:tier", authMiddleware, adminMiddleware, async (c) => {
  const tier = c.req.param("tier");
  const { discount_percent, description } = await c.req.json();
  const db = c.env.DB;

  const existing = await db.prepare("SELECT * FROM membership_settings WHERE tier = ?").bind(tier).first();
  if (!existing) {
    return c.json({ error: "Tier not found" }, 404);
  }

  await db.prepare(`
    UPDATE membership_settings 
    SET discount_percent = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE tier = ?
  `).bind(discount_percent, description, tier).run();

  return c.json({ success: true });
});

// Get membership discounts (public - for booking wizard)
app.get("/api/membership-discounts", async (c) => {
  const db = c.env.DB;
  const settings = await db.prepare("SELECT tier, discount_percent FROM membership_settings").all();
  const discounts: Record<string, number> = {};
  (settings.results || []).forEach((s: any) => {
    discounts[s.tier] = s.discount_percent;
  });
  return c.json(discounts);
});

export default app;
