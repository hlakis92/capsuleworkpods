import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerPodRoutes(app: App) {
  // GET /api/pods/:id - Get single pod by id with location
  app.fastify.get(
    '/api/pods/:id',
    {
      schema: {
        description: 'Get pod by id with location',
        tags: ['pods'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: { type: 'object' },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      app.logger.info({ podId: id }, 'Getting pod');

      const pod = await app.db.query.pods.findFirst({
        where: eq(schema.pods.id, id),
        with: { location: true },
      });

      if (!pod) {
        app.logger.warn({ podId: id }, 'Pod not found');
        return reply.status(404).send({ error: 'Pod not found' });
      }

      return pod;
    }
  );

  // GET /api/pods/:id/availability - Get booked slots for a pod on a date
  app.fastify.get(
    '/api/pods/:id/availability',
    {
      schema: {
        description: 'Get booked time slots for pod on a specific date',
        tags: ['pods'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          required: ['date'],
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              booked_slots: { type: 'array' },
            },
          },
          400: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: { date: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { date } = request.query;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: 'Invalid date format, use YYYY-MM-DD' });
      }

      app.logger.info({ podId: id, date }, 'Getting pod availability');

      const bookings = await app.db
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.podId, id));

      const targetDate = new Date(date);
      const bookedSlots = bookings
        .filter((b) => {
          const bookingDate = new Date(b.bookingStartTime);
          return (
            bookingDate.toISOString().split('T')[0] === date &&
            b.status !== 'cancelled'
          );
        })
        .map((b) => ({
          start_time: b.bookingStartTime.toISOString(),
          end_time: b.bookingEndTime.toISOString(),
          status: b.status,
        }));

      return { booked_slots: bookedSlots };
    }
  );
}
