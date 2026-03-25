import type { App } from '../index.js';

export function registerMembershipRoutes(app: App) {
  // GET /api/membership-tiers - Get all membership tiers
  app.fastify.get(
    '/api/membership-tiers',
    {
      schema: {
        description: 'Get all membership tiers',
        tags: ['membership'],
        response: {
          200: {
            type: 'object',
            properties: {
              tiers: { type: 'array' },
            },
          },
        },
      },
    },
    async () => {
      app.logger.info('Getting membership tiers');

      const tiers = await app.db.query.membershipSettings.findMany({
        orderBy: (settings) => settings.monthlyPrice,
      });

      return { tiers };
    }
  );

  // GET /api/membership-discounts - Get membership discounts mapping
  app.fastify.get(
    '/api/membership-discounts',
    {
      schema: {
        description: 'Get membership tier discount percentages',
        tags: ['membership'],
        response: {
          200: { type: 'object' },
        },
      },
    },
    async () => {
      app.logger.info('Getting membership discounts');

      const settings = await app.db.query.membershipSettings.findMany();

      const discounts: Record<string, number> = {};
      for (const setting of settings) {
        discounts[setting.tier as string] = Number(setting.discountPercent);
      }

      return discounts;
    }
  );
}
