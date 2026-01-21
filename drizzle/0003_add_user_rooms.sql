-- Add support for user-created rooms
-- Users can create rooms with custom titles, but max 5 per area

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_user_room BOOLEAN DEFAULT false NOT NULL;

-- Create an index for efficient querying of user rooms in an area
CREATE INDEX IF NOT EXISTS idx_user_rooms_location ON rooms USING GIST (location) WHERE is_user_room = true;
