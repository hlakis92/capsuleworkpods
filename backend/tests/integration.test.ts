import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus } from "./helpers";

describe("API Integration Tests", () => {
  // Shared state for chaining tests
  let authToken: string;
  let userId: string;
  let podId: string;
  let locationSlug: string;
  let bookingId: string;

  // ============================================================================
  // Unauthenticated endpoints - Locations
  // ============================================================================

  test("GET /api/locations - should return list of locations", async () => {
    const res = await api("/api/locations");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("locations");
    expect(Array.isArray(data.locations)).toBe(true);

    // Extract location slug and pod ID for later tests
    if (data.locations.length > 0) {
      locationSlug = data.locations[0].slug;
      if (data.locations[0].pods && data.locations[0].pods.length > 0) {
        podId = data.locations[0].pods[0].id;
      }
    }
  });

  test("GET /api/locations/{slug} - should return location by slug when valid", async () => {
    if (!locationSlug) {
      // Skip if no location found in previous test
      return;
    }
    const res = await api(`/api/locations/${locationSlug}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("GET /api/locations/{slug} - should return 404 for invalid slug", async () => {
    const res = await api("/api/locations/nonexistent-slug-12345");
    await expectStatus(res, 404);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  // ============================================================================
  // Unauthenticated endpoints - Pods
  // ============================================================================

  test("GET /api/pods/{id} - should return pod when valid UUID exists", async () => {
    if (!podId) {
      // Skip if no pod found in locations test
      return;
    }
    const res = await api(`/api/pods/${podId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("GET /api/pods/{id} - should return 404 for nonexistent UUID", async () => {
    const res = await api("/api/pods/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("GET /api/pods/{id}/availability - should return booked slots for valid date", async () => {
    if (!podId) {
      return;
    }
    const res = await api(`/api/pods/${podId}/availability?date=2026-03-25`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("booked_slots");
    expect(Array.isArray(data.booked_slots)).toBe(true);
  });

  test("GET /api/pods/{id}/availability - should return 400 for invalid date format", async () => {
    if (!podId) {
      return;
    }
    const res = await api(`/api/pods/${podId}/availability?date=invalid-date`);
    await expectStatus(res, 400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("GET /api/pods/{id}/availability - should return 400 when date param is missing", async () => {
    if (!podId) {
      return;
    }
    const res = await api(`/api/pods/${podId}/availability`);
    await expectStatus(res, 400);
  });

  // ============================================================================
  // Unauthenticated endpoints - Membership
  // ============================================================================

  test("GET /api/membership-tiers - should return list of tiers", async () => {
    const res = await api("/api/membership-tiers");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("tiers");
    expect(Array.isArray(data.tiers)).toBe(true);
  });

  test("GET /api/membership-discounts - should return discount information", async () => {
    const res = await api("/api/membership-discounts");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  // ============================================================================
  // Authentication setup
  // ============================================================================

  test("Sign up test user", async () => {
    const { token, user } = await signUpTestUser();
    authToken = token;
    userId = user.id;
    expect(authToken).toBeDefined();
    expect(userId).toBeDefined();
  });

  // ============================================================================
  // Authenticated endpoints - Users
  // ============================================================================

  test("GET /api/users/me - should return authenticated user profile", async () => {
    const res = await authenticatedApi("/api/users/me", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("GET /api/users/me - should return 401 without authentication", async () => {
    const res = await api("/api/users/me");
    await expectStatus(res, 401);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  // ============================================================================
  // Authenticated endpoints - Bookings (Create)
  // ============================================================================

  test("POST /api/bookings - should create booking with valid data", async () => {
    if (!podId) {
      // Skip if no pod found from locations
      return;
    }
    const res = await authenticatedApi("/api/bookings", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pod_id: podId,
        start_time: "2026-04-15T10:00:00Z",
        end_time: "2026-04-15T11:00:00Z",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    bookingId = data.id;
    expect(bookingId).toBeDefined();
  });

  test("POST /api/bookings - should return 400 when missing start_time", async () => {
    if (!podId) {
      return;
    }
    const res = await authenticatedApi("/api/bookings", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pod_id: podId,
        end_time: "2026-04-15T11:00:00Z",
      }),
    });
    await expectStatus(res, 400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("POST /api/bookings - should return 400 when missing end_time", async () => {
    if (!podId) {
      return;
    }
    const res = await authenticatedApi("/api/bookings", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pod_id: podId,
        start_time: "2026-04-15T10:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/bookings - should return 400 when missing pod_id", async () => {
    const res = await authenticatedApi("/api/bookings", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_time: "2026-04-15T10:00:00Z",
        end_time: "2026-04-15T11:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/bookings - should return 404 for nonexistent pod", async () => {
    const res = await authenticatedApi("/api/bookings", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pod_id: "00000000-0000-0000-0000-000000000000",
        start_time: "2026-04-15T10:00:00Z",
        end_time: "2026-04-15T11:00:00Z",
      }),
    });
    await expectStatus(res, 404);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("POST /api/bookings - should return 401 without authentication", async () => {
    if (!podId) {
      return;
    }
    const res = await api("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pod_id: podId,
        start_time: "2026-04-15T10:00:00Z",
        end_time: "2026-04-15T11:00:00Z",
      }),
    });
    await expectStatus(res, 401);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  // ============================================================================
  // Authenticated endpoints - Bookings (Read)
  // ============================================================================

  test("GET /api/bookings - should return user's bookings", async () => {
    const res = await authenticatedApi("/api/bookings", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("bookings");
    expect(Array.isArray(data.bookings)).toBe(true);
  });

  test("GET /api/bookings - should return 401 without authentication", async () => {
    const res = await api("/api/bookings");
    await expectStatus(res, 401);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("GET /api/bookings/{id} - should return booking by id when owner", async () => {
    if (!bookingId) {
      return;
    }
    const res = await authenticatedApi(`/api/bookings/${bookingId}`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("GET /api/bookings/{id} - should return 404 for nonexistent booking", async () => {
    const res = await authenticatedApi("/api/bookings/00000000-0000-0000-0000-000000000000", authToken);
    await expectStatus(res, 404);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("GET /api/bookings/{id} - should return 401 without authentication", async () => {
    const res = await api("/api/bookings/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 401);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  // ============================================================================
  // Authenticated endpoints - Checkout
  // ============================================================================

  test("POST /api/checkout - should create checkout session for valid booking", async () => {
    if (!bookingId) {
      return;
    }
    const res = await authenticatedApi("/api/checkout", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toHaveProperty("checkout_url");
  });

  test("POST /api/checkout - should return 400 when missing booking_id", async () => {
    const res = await authenticatedApi("/api/checkout", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("POST /api/checkout - should return 400 for invalid UUID format", async () => {
    const res = await authenticatedApi("/api/checkout", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: "invalid-uuid-format",
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/checkout - should return 404 for nonexistent booking", async () => {
    const res = await authenticatedApi("/api/checkout", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    await expectStatus(res, 404);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("POST /api/checkout - should return 401 without authentication", async () => {
    const res = await api("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    await expectStatus(res, 401);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });
});
