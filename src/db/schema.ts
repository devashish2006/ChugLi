import { pgTable, uuid, text, timestamp, customType } from "drizzle-orm/pg-core";

const geography = customType<{ data: { latitude: number; longitude: number } }>({
  dataType() {
    return 'geography(Point, 4326)';
  },
});

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  location: geography('location').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});