-- Delete all messages from user rooms first (due to foreign key constraint)
DELETE FROM messages 
WHERE room_id IN (
  SELECT id FROM rooms WHERE is_user_room = true
);

-- Delete all user-created rooms
DELETE FROM rooms 
WHERE is_user_room = true;

-- Verify deletion
SELECT COUNT(*) as remaining_user_rooms FROM rooms WHERE is_user_room = true;
