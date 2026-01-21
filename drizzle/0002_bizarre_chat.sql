CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"username" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "is_system_room" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "room_type" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "city_name" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "active_hour_start" integer;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "active_hour_end" integer;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "is_user_room" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;