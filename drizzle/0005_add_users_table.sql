-- Create users table for OAuth authentication
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oauth_provider" varchar(50) NOT NULL,
	"oauth_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp DEFAULT now() NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	CONSTRAINT "users_oauth_provider_oauth_id_unique" UNIQUE("oauth_provider","oauth_id")
);

-- Add user_id to messages table to track authenticated users
ALTER TABLE "messages" ADD COLUMN "user_id" uuid;
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "users_oauth_provider_oauth_id_idx" ON "users" ("oauth_provider","oauth_id");
CREATE INDEX IF NOT EXISTS "messages_user_id_idx" ON "messages" ("user_id");
