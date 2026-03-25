import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  time,
  date,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

// Locations table
export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    address: text('address').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    latitude: numeric('latitude', { precision: 10, scale: 6 }).notNull(),
    longitude: numeric('longitude', { precision: 10, scale: 6 }).notNull(),
    imageUrl: text('image_url'),
    description: text('description'),
    openHours: text('open_hours'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_locations_slug').on(table.slug),
    index('idx_locations_created_at').on(table.createdAt),
  ]
);

// Pods table
export const pods = pgTable(
  'pods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    locationId: uuid('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: text('type').notNull(), // 'standard', 'executive', 'quiet', 'premium', 'family'
    pricePerHour: numeric('price_per_hour', { precision: 10, scale: 2 }).notNull(),
    amenities: text('amenities').array(),
    imageUrl: text('image_url'),
    status: text('status').notNull().default('available'), // 'available', 'out_of_service'
    isAvailable: boolean('is_available').notNull().default(true),
    isOutOfService: boolean('is_out_of_service').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_pods_slug').on(table.slug),
    index('idx_pods_location_id').on(table.locationId),
    index('idx_pods_is_available').on(table.isAvailable),
  ]
);

// Bookings table
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    podId: uuid('pod_id').notNull().references(() => pods.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'date' }).notNull(),
    startTime: time('start_time').notNull(),
    durationHours: numeric('duration_hours', { precision: 10, scale: 2 }).notNull(),
    bookingStartTime: timestamp('booking_start_time', { withTimezone: true }).notNull(),
    bookingEndTime: timestamp('booking_end_time', { withTimezone: true }).notNull(),
    priceBase: numeric('price_base', { precision: 10, scale: 2 }).notNull(),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
    priceFinal: numeric('price_final', { precision: 10, scale: 2 }).notNull(),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(), // kept for compatibility
    status: text('status').notNull().default('pending'), // 'pending', 'confirmed', 'cancelled'
    paymentStatus: text('payment_status').notNull().default('unpaid'), // 'unpaid', 'paid', 'failed'
    stripeSessionId: text('stripe_session_id'),
    qrToken: text('qr_token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_bookings_user_id').on(table.userId),
    index('idx_bookings_pod_id').on(table.podId),
    index('idx_bookings_date').on(table.date),
    index('idx_bookings_status').on(table.status),
    index('idx_bookings_booking_start_time').on(table.bookingStartTime),
    uniqueIndex('idx_bookings_qr_token').on(table.qrToken),
  ]
);

// User Profiles table
export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    membershipTier: text('membership_tier').notNull().default('free'), // 'free', 'plus', 'pro'
    isAdmin: boolean('is_admin').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_profiles_user_id').on(table.userId),
    index('idx_user_profiles_membership_tier').on(table.membershipTier),
  ]
);

// Membership Settings table
export const membershipSettings = pgTable(
  'membership_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tier: text('tier').notNull().unique(), // 'free', 'plus', 'pro'
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    description: text('description'),
    monthlyPrice: numeric('monthly_price', { precision: 10, scale: 2 }).notNull().default('0'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_membership_settings_tier').on(table.tier),
  ]
);

// Relations
export const locationsRelations = relations(locations, ({ many }) => ({
  pods: many(pods),
}));

export const podsRelations = relations(pods, ({ one, many }) => ({
  location: one(locations, {
    fields: [pods.locationId],
    references: [locations.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(userProfiles, {
    fields: [bookings.userId],
    references: [userProfiles.userId],
  }),
  pod: one(pods, {
    fields: [bookings.podId],
    references: [pods.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  user: one(user, {
    fields: [userProfiles.userId],
    references: [user.id],
  }),
  bookings: many(bookings),
}));
