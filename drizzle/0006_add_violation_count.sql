-- Add violation_count column to users table
ALTER TABLE "users" ADD COLUMN "violation_count" integer DEFAULT 0 NOT NULL;
