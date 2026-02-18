import { pgTable, uuid, text, timestamp, customType, boolean, integer, varchar } from "drizzle-orm/pg-core";

const geography = customType<{ data: { latitude: number; longitude: number } }>({
  dataType() {
    return 'geography(Point, 4326)';
  },
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  oauthProvider: varchar('oauth_provider', { length: 50 }).notNull(),
  oauthId: varchar('oauth_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  anonymousName: varchar('anonymous_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLogin: timestamp('last_login').defaultNow().notNull(),
  banned: boolean('banned').default(false).notNull(),
  banReason: text('ban_reason'),
  bannedAt: timestamp('banned_at'),
  violationCount: integer('violation_count').default(0).notNull(),
});

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  location: geography('location').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  // System room fields
  isSystemRoom: boolean('is_system_room').default(false).notNull(),
  roomType: text('room_type'), // confession, city, hostel, exam, latenight, morning, matchday
  cityName: text('city_name'), // For city room personalization
  activeHourStart: integer('active_hour_start'), // For time-sensitive rooms (0-23)
  activeHourEnd: integer('active_hour_end'), // For time-sensitive rooms (0-23)
  prompt: text('prompt'), // Room-specific prompt/description
  // User-created room fields
  isUserRoom: boolean('is_user_room').default(false).notNull(),
  createdBy: text('created_by'), // Username of creator
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  username: text('username').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
});