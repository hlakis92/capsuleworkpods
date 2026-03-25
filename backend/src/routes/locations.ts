import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';

export function registerLocationRoutes(app: App) {
  // GET /api/locations - Get all locations with pod counts
  app.fastify.get(
    '/api/locations',
    {
      schema: {
        description: 'Get all locations with pod availability counts',
        tags: ['locations'],
        response: {
          200: {
            type: 'object',
            properties: {
              locations: { type: 'array' },
            },
          },
        },
      },
    },
    async () => {
      app.logger.info('Getting all locations');

      const allLocations = await app.db.query.locations.findMany();

      const locationsWithCounts = allLocations.map((location) => {
        return {
          ...location,
          pod_count: 0,
          available_pod_count: 0,
        };
      });

      return { locations: locationsWithCounts };
    }
  );

  // GET /api/locations/:slug - Get single location by slug with pods
  app.fastify.get(
    '/api/locations/:slug',
    {
      schema: {
        description: 'Get location by slug with all its pods',
        tags: ['locations'],
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object' },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug } = request.params;

      app.logger.info({ slug }, 'Getting location by slug');

      const location = await app.db.query.locations.findFirst({
        where: eq(schema.locations.slug, slug),
        with: {
          pods: true,
        },
      });

      if (!location) {
        app.logger.warn({ slug }, 'Location not found');
        return reply.status(404).send({ error: 'Location not found' });
      }

      return location;
    }
  );
}
