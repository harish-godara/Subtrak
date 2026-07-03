CREATE TABLE "script_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"platform" varchar(100) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"script_content" text NOT NULL,
	"credential_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"script_mode" varchar(20) DEFAULT 'data' NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"template_type" varchar(20) DEFAULT 'script' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"key_name" varchar(100) NOT NULL,
	"encrypted_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"account_label" varchar(150),
	"logo" text,
	"category" varchar(50) DEFAULT 'Other' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"currency" varchar(5) DEFAULT 'INR' NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
	"color" varchar(10) DEFAULT '#4F46E5' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"otp_required" boolean DEFAULT false NOT NULL,
	"credits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cost" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"integration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"custom_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"browser_session" jsonb,
	"department" varchar(100),
	"owner" varchar(150),
	"people_using" text,
	"plan_name" varchar(100),
	"service_type" varchar(100),
	"client" varchar(150),
	"auto_renew" boolean DEFAULT false NOT NULL,
	"invoices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "script_templates" ADD CONSTRAINT "script_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tmpl_user" ON "script_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_secret_sub" ON "secrets" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_secret" ON "secrets" USING btree ("user_id","subscription_id","key_name");--> statement-breakpoint
CREATE INDEX "idx_sub_user" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sub_category" ON "subscriptions" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "idx_sub_client" ON "subscriptions" USING btree ("user_id","client");--> statement-breakpoint
CREATE INDEX "idx_sub_department" ON "subscriptions" USING btree ("user_id","department");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");