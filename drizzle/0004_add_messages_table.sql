-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"username" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint with cascade delete
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" 
FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") 
ON DELETE cascade ON UPDATE no action;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "idx_messages_room_id" ON "messages"("room_id");
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "messages"("created_at");
