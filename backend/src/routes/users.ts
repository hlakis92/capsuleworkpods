import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import { randomUUID } from 'crypto';

export function registerUserRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/users/me - Get authenticated user profile
  app.fastify.get(
    '/api/users/me',
    {
      schema: {
        description: 'Get authenticated user profile with membership info',
        tags: ['users'],
        response: {
          200: { type: 'object' },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Getting user profile');

      // Get user from auth table
      const user = await app.db.query.user.findFirst({
        where: eq(authSchema.user.id, session.user.id),
      });

      if (!user) {
        app.logger.warn({ userId: session.user.id }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      // Get or create user profile
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

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        membership_tier: userProfile.membershipTier,
        is_admin: userProfile.isAdmin,
        created_at: user.createdAt,
      };
    }
  );
}
