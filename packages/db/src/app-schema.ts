// packages/db/src/app-schema.ts
import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  index, // Import index
} from 'drizzle-orm/pg-core';
import { users } from './auth-schema'; // Assuming user IDs might relate to this
import { sql } from 'drizzle-orm'; // For defaultFn

export const categories = pgTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // User-specific categories, linked to auth users
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('category_user_idx').on(table.userId),
  userCategoryNameUnique: index('user_category_name_unique_idx').on(table.userId, table.name), // If categories should be unique per user
}));

export const notes = pgTable('notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text('content'), // For 10tap-editor JSON data
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }), // Allow notes to exist without a category, or category deleted
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).defaultNow().notNull(),
  // PowerSync generally handles its own updated_at via its oplog,
  // but having one can be useful for application logic if needed before sync.
  // For direct DB changes outside PowerSync, an auto-updating timestamp is good.
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).defaultNow().$onUpdate(() => new Date().toISOString()),
}, (table) => ({
  userIdx: index('note_user_idx').on(table.userId),
  categoryIdx: index('note_category_idx').on(table.categoryId),
  userCreatedAtIdx: index('note_user_created_at_idx').on(table.userId, table.createdAt), // For sorting user's notes by creation time
}));
