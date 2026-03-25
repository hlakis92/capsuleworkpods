// Extend the Env interface with app-specific bindings
interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Bucket
  R2_BUCKET: R2Bucket;
  
  // Email Service
  EMAILS: {
    sendEmail: (params: {
      to: string;
      subject: string;
      html: string;
    }) => Promise<void>;
  };
  
  // Mocha Auth (auto-injected)
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  
  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}
