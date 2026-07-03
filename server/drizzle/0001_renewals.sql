-- Renewal / plan-change history for subscriptions.
-- Idempotent so it can be applied safely via psql or drizzle-kit migrate.
-- (The team's primary workflow is `npm run db:push`, which syncs schema.ts directly.)
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "renewals" jsonb DEFAULT '[]'::jsonb NOT NULL;
