import { createApplication } from '@specific-dev/framework';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';

// Import route registration functions
import { registerLocationRoutes } from './routes/locations.js';
import { registerPodRoutes } from './routes/pods.js';
import { registerBookingRoutes } from './routes/bookings.js';
import { registerMembershipRoutes } from './routes/membership.js';
import { registerUserRoutes } from './routes/users.js';

// Combine schemas
const schema = { ...appSchema, ...authSchema };

export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with Better Auth
app.withAuth();

// Register routes
registerLocationRoutes(app);
registerPodRoutes(app);
registerBookingRoutes(app);
registerMembershipRoutes(app);
registerUserRoutes(app);

await app.run();
app.logger.info('Application running');
