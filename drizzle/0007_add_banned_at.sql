-- Add bannedAt column to users table
ALTER TABLE users ADD COLUMN banned_at TIMESTAMP;
