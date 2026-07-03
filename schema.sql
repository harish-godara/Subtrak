-- ═══════════════════════════════════════════════════════════
-- SubTrack — Database schema for Supabase
-- ═══════════════════════════════════════════════════════════
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- Creates all 4 tables, their foreign keys, and indexes.
-- Safe to re-run (uses IF NOT EXISTS). gen_random_uuid() is built into
-- Supabase's Postgres, so nothing extra needs to be enabled.
-- ═══════════════════════════════════════════════════════════

-- ── users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email"         varchar(255) NOT NULL,
  "name"          varchar(100) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "role"          varchar(20)  DEFAULT 'user' NOT NULL,
  "settings"      jsonb        DEFAULT '{}'::jsonb NOT NULL,
  "created_at"    timestamptz  DEFAULT now() NOT NULL,
  "updated_at"    timestamptz  DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE ("email")
);

-- ── subscriptions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"         uuid NOT NULL,
  "name"            varchar(100) NOT NULL,
  "account_label"   varchar(150),
  "logo"            text,
  "category"        varchar(50)  DEFAULT 'Other' NOT NULL,
  "status"          varchar(20)  DEFAULT 'active' NOT NULL,
  "currency"        varchar(5)   DEFAULT 'INR' NOT NULL,
  "billing_cycle"   varchar(20)  DEFAULT 'monthly' NOT NULL,
  "color"           varchar(10)  DEFAULT '#4F46E5' NOT NULL,
  "notes"           text         DEFAULT '' NOT NULL,
  "otp_required"    boolean      DEFAULT false NOT NULL,
  "credits"         jsonb        DEFAULT '{}'::jsonb NOT NULL,
  "dates"           jsonb        DEFAULT '{}'::jsonb NOT NULL,
  "cost"            jsonb        DEFAULT '{}'::jsonb NOT NULL,
  "integration"     jsonb        DEFAULT '{}'::jsonb NOT NULL,
  "custom_data"     jsonb        DEFAULT '{}'::jsonb NOT NULL,
  "browser_session" jsonb,
  "department"      varchar(100),
  "owner"           varchar(150),
  "platform"        varchar(100),
  "people_using"    text,
  "plan_name"       varchar(100),
  "service_type"    varchar(100),
  "client"          varchar(150),
  "auto_renew"      boolean      DEFAULT false NOT NULL,
  "invoices"        jsonb        DEFAULT '[]'::jsonb NOT NULL,
  "created_at"      timestamptz  DEFAULT now() NOT NULL,
  "updated_at"      timestamptz  DEFAULT now() NOT NULL,
  CONSTRAINT "subscriptions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ── script_templates ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "script_templates" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"           uuid NOT NULL,
  "name"              varchar(100) NOT NULL,
  "platform"          varchar(100) DEFAULT '' NOT NULL,
  "description"       text         DEFAULT '' NOT NULL,
  "script_content"    text NOT NULL,
  "credential_fields" jsonb        DEFAULT '[]'::jsonb NOT NULL,
  "script_mode"       varchar(20)  DEFAULT 'data' NOT NULL,
  "is_global"         boolean      DEFAULT false NOT NULL,
  "template_type"     varchar(20)  DEFAULT 'script' NOT NULL,
  "created_at"        timestamptz  DEFAULT now() NOT NULL,
  "updated_at"        timestamptz  DEFAULT now() NOT NULL,
  CONSTRAINT "script_templates_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ── secrets ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "secrets" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"         uuid NOT NULL,
  "subscription_id" uuid,
  "key_name"        varchar(100) NOT NULL,
  "encrypted_value" text NOT NULL,
  "created_at"      timestamptz  DEFAULT now() NOT NULL,
  "updated_at"      timestamptz  DEFAULT now() NOT NULL,
  CONSTRAINT "secrets_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "secrets_subscription_id_subscriptions_id_fk"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL
);

-- ── indexes ────────────────────────────────────────────────
CREATE INDEX        IF NOT EXISTS "idx_users_email"    ON "users" ("email");
CREATE INDEX        IF NOT EXISTS "idx_sub_user"       ON "subscriptions" ("user_id");
CREATE INDEX        IF NOT EXISTS "idx_sub_category"   ON "subscriptions" ("user_id", "category");
CREATE INDEX        IF NOT EXISTS "idx_sub_client"     ON "subscriptions" ("user_id", "client");
CREATE INDEX        IF NOT EXISTS "idx_sub_department" ON "subscriptions" ("user_id", "department");
CREATE INDEX        IF NOT EXISTS "idx_tmpl_user"      ON "script_templates" ("user_id");
CREATE INDEX        IF NOT EXISTS "idx_secret_sub"     ON "secrets" ("subscription_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_secret"          ON "secrets" ("user_id", "subscription_id", "key_name");
