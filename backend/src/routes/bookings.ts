import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';

interface CreateBookingBody {
  pod_id: string;
  start_time: string;
  end_time: string;
}

export function registerBookingRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/bookings - Create a new booking
  app.fastify.post(
    '/api/bookings',
    {
      schema: {
        description: 'Create a new booking',
        tags: ['bookings'],
        body: {
          type: 'object',
          required: ['pod_id', 'start_time', 'end_time'],
          properties: {
            pod_id: { type: 'string', format: 'uuid' },
            start_time: { type: 'string', format: 'date-time' },
            end_time: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          201: { type: 'object' },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateBookingBody }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { pod_id, start_time, end_time } = request.body;

      app.logger.info({ userId: session.user.id, podId: pod_id }, 'Creating booking');

      // Validate pod exists and is available
      const pod = await app.db.query.pods.findFirst({
        where: eq(schema.pods.id, pod_id),
      });

      if (!pod) {
        app.logger.warn({ podId: pod_id }, 'Pod not found');
        return reply.status(404).send({ error: 'Pod not found' });
      }

      if (!pod.isAvailable || pod.isOutOfService) {
        app.logger.warn({ podId: pod_id }, 'Pod not available');
        return reply.status(400).send({ error: 'Pod is not available' });
      }

      // Parse timestamps
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (duration <= 0) {
        return reply.status(400).send({ error: 'End time must be after start time' });
      }

      // Get user profile for membership discount
      let userProfile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, session.user.id),
      });

      if (!userProfile) {
        // Create default profile
        userProfile = {
          id: randomUUID(),
          userId: session.user.id,
          membershipTier: 'free',
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await app.db.insert(schema.userProfiles).values(userProfile);
      }

      // Get membership discount
      const membershipSetting = await app.db.query.membershipSettings.findFirst({
        where: eq(schema.membershipSettings.tier, userProfile.membershipTier),
      });

      const discountPercent = membershipSetting?.discountPercent || 0;
      const priceBase = duration * Number(pod.pricePerHour);
      const discountAmount = (priceBase * Number(discountPercent)) / 100;
      const priceFinal = priceBase - discountAmount;

      // Create booking
      const bookingId = randomUUID();
      const qrToken = randomUUID();

      await app.db.insert(schema.bookings).values({
        id: bookingId,
        userId: session.user.id,
        podId: pod_id,
        date: new Date(startTime.toISOString().split('T')[0]),
        startTime: startTime.toISOString().split('T')[1].slice(0, 8),
        durationHours: duration.toString(),
        bookingStartTime: startTime,
        bookingEndTime: endTime,
        priceBase: priceBase.toString(),
        discountPercent: discountPercent.toString(),
        discountAmount: discountAmount.toString(),
        priceFinal: priceFinal.toString(),
        totalPrice: priceFinal.toString(),
        status: 'pending',
        paymentStatus: 'unpaid',
        qrToken,
      });

      app.logger.info({ bookingId }, 'Booking created successfully');

      return reply.status(201).send({
        id: bookingId,
        pod_id,
        user_id: session.user.id,
        booking_start_time: startTime.toISOString(),
        booking_end_time: endTime.toISOString(),
        price_base: priceBase,
        discount_percent: Number(discountPercent),
        discount_amount: discountAmount,
        price_final: priceFinal,
        status: 'pending',
        payment_status: 'unpaid',
        qr_token: qrToken,
      });
    }
  );

  // GET /api/bookings - Get all bookings for authenticated user
  app.fastify.get(
    '/api/bookings',
    {
      schema: {
        description: 'Get all bookings for authenticated user',
        tags: ['bookings'],
        response: {
          200: {
            type: 'object',
            properties: {
              bookings: { type: 'array' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Getting user bookings');

      const bookings = await app.db
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.userId, session.user.id));

      const bookingsWithPods = await Promise.all(
        bookings.map(async (booking) => {
          const pod = await app.db.query.pods.findFirst({
            where: eq(schema.pods.id, booking.podId),
            with: { location: true },
          });
          return { ...booking, pod };
        })
      );

      return { bookings: bookingsWithPods };
    }
  );

  // GET /api/bookings/:id - Get single booking
  app.fastify.get(
    '/api/bookings/:id',
    {
      schema: {
        description: 'Get booking by id',
        tags: ['bookings'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: { type: 'object' },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;

      app.logger.info({ bookingId: id }, 'Getting booking');

      const booking = await app.db.query.bookings.findFirst({
        where: eq(schema.bookings.id, id),
        with: { pod: { with: { location: true } } },
      });

      if (!booking) {
        app.logger.warn({ bookingId: id }, 'Booking not found');
        return reply.status(404).send({ error: 'Booking not found' });
      }

      if (booking.userId !== session.user.id) {
        app.logger.warn({ bookingId: id, userId: session.user.id }, 'Forbidden');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      return booking;
    }
  );

  // POST /api/checkout - Create Stripe checkout session
  app.fastify.post(
    '/api/checkout',
    {
      schema: {
        description: 'Create Stripe checkout session for booking',
        tags: ['bookings'],
        body: {
          type: 'object',
          required: ['booking_id'],
          properties: {
            booking_id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              checkout_url: { type: 'string' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { booking_id: string } }>, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { booking_id } = request.body;

      app.logger.info({ bookingId: booking_id, userId: session.user.id }, 'Creating checkout session');

      // Get booking
      const booking = await app.db.query.bookings.findFirst({
        where: eq(schema.bookings.id, booking_id),
        with: { pod: true },
      });

      if (!booking) {
        app.logger.warn({ bookingId: booking_id }, 'Booking not found');
        return reply.status(404).send({ error: 'Booking not found' });
      }

      if (booking.userId !== session.user.id) {
        app.logger.warn({ bookingId: booking_id, userId: session.user.id }, 'Forbidden');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_fake');

        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: session.user.email,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: booking.pod.name,
                  description: `Pod booking for ${new Date(booking.bookingStartTime).toLocaleString()}`,
                },
                unit_amount: Math.round(Number(booking.priceFinal) * 100),
              },
              quantity: 1,
            },
          ],
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bookings/${booking_id}?success=true`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bookings/${booking_id}?success=false`,
          metadata: {
            booking_id,
            user_id: session.user.id,
          },
        });

        // Update booking with Stripe session ID
        await app.db
          .update(schema.bookings)
          .set({ stripeSessionId: checkoutSession.id })
          .where(eq(schema.bookings.id, booking_id));

        app.logger.info({ bookingId: booking_id, sessionId: checkoutSession.id }, 'Checkout session created');

        return { checkout_url: checkoutSession.url };
      } catch (error) {
        app.logger.error({ err: error, bookingId: booking_id }, 'Failed to create checkout session');
        return reply.status(400).send({ error: 'Failed to create checkout session' });
      }
    }
  );
}
