/**
 * Database Schema — Drizzle ORM table definitions for SubTrack.
 * Matches the existing PostgreSQL schema exactly.
 *
 * Tables:
 *   - users             : Authentication + profile
 *   - script_templates  : Per-user reusable automation scripts
 *   - subscriptions     : SaaS subscription tracking (per-user)
 *   - secrets           : Encrypted credential/token vault
 */
import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, uniqueIndex, } from 'drizzle-orm/pg-core';
// ── Users ──────────────────────────────────────────────
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('user'),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('idx_users_email').on(table.email),
]);
// ── Script Templates ──────────────────────────────────
export const scriptTemplates = pgTable('script_templates', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    platform: varchar('platform', { length: 100 }).notNull().default(''),
    description: text('description').notNull().default(''),
    scriptContent: text('script_content').notNull(),
    credentialFields: jsonb('credential_fields').notNull().default([]),
    scriptMode: varchar('script_mode', { length: 20 }).notNull().default('data'),
    isGlobal: boolean('is_global').notNull().default(false),
    templateType: varchar('template_type', { length: 20 }).notNull().default('script'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('idx_tmpl_user').on(table.userId),
]);
// ── Subscriptions ──────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    accountLabel: varchar('account_label', { length: 150 }),
    logo: text('logo'),
    category: varchar('category', { length: 50 }).notNull().default('Other'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    currency: varchar('currency', { length: 5 }).notNull().default('INR'),
    billingCycle: varchar('billing_cycle', { length: 20 }).notNull().default('monthly'),
    color: varchar('color', { length: 10 }).notNull().default('#4F46E5'),
    notes: text('notes').notNull().default(''),
    otpRequired: boolean('otp_required').notNull().default(false),
    credits: jsonb('credits').notNull().default({}),
    dates: jsonb('dates').notNull().default({}),
    cost: jsonb('cost').notNull().default({}),
    integration: jsonb('integration').notNull().default({}),
    customData: jsonb('custom_data').notNull().default({}),
    browserSession: jsonb('browser_session'), // Playwright storageState (cookies, localStorage) — ephemeral, per-subscription
    // ── Enhanced Business Fields ──
    department: varchar('department', { length: 100 }),
    owner: varchar('owner', { length: 150 }),
    platform: varchar('platform', { length: 100 }),
    peopleUsing: text('people_using'), // comma-separated names, rendered as tags
    planName: varchar('plan_name', { length: 100 }),
    serviceType: varchar('service_type', { length: 100 }),
    client: varchar('client', { length: 150 }),
    autoRenew: boolean('auto_renew').notNull().default(false),
    invoices: jsonb('invoices').notNull().default([]), // Array of invoice/payment records
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('idx_sub_user').on(table.userId),
    index('idx_sub_category').on(table.userId, table.category),
    index('idx_sub_client').on(table.userId, table.client),
    index('idx_sub_department').on(table.userId, table.department),
]);
// ── Secrets (Encrypted Vault) ──────────────────────────
export const secrets = pgTable('secrets', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
    keyName: varchar('key_name', { length: 100 }).notNull(),
    encryptedValue: text('encrypted_value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('idx_secret_sub').on(table.subscriptionId),
    uniqueIndex('uq_secret').on(table.userId, table.subscriptionId, table.keyName),
]);
//# sourceMappingURL=schema.js.map