-- Add system room fields to rooms table
ALTER TABLE rooms 
ADD COLUMN is_system_room BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN room_type TEXT,
ADD COLUMN city_name TEXT,
ADD COLUMN active_hour_start INTEGER,
ADD COLUMN active_hour_end INTEGER,
ADD COLUMN prompt TEXT;

-- Create index for faster system room queries
CREATE INDEX idx_rooms_system_type ON rooms(is_system_room, room_type) WHERE is_system_room = true;
CREATE INDEX idx_rooms_expires_at ON rooms(expires_at);
