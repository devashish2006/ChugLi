import { Injectable, Logger, Inject, forwardRef, BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import {
  RoomType,
  ROOM_TYPE_CONFIGS,
  getRoomTypeConfig,
  isRoomActiveNow,
  formatRoomName,
  formatRoomPrompt,
} from './room-types.config';
import { contentModeration } from '../utils/content-moderation';

export interface SystemRoom {
  id: string;
  name: string;
  roomType: string;
  prompt: string;
  distance_in_meters: number;
  isActive: boolean;
  isTimeSensitive?: boolean;
  activeHourStart?: number;
  activeHourEnd?: number;
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  
  // Room user tracking (shared with ChatGateway)
  private roomUsers = new Map<string, Map<string, string>>();

  constructor(
    @Inject(forwardRef(() => require('../chat/chat.gateway').ChatGateway))
    private chatGateway: any,
  ) {}

  getRoomUsers() {
    return this.roomUsers;
  }

  async createRoom(
    name: string,
    lat: number,
    lng: number,
  ) {
    // 🔒 STRICT CONTENT MODERATION for room title
    const moderationResult = contentModeration.checkMessage(name, 'confession'); // Use strictest level
    
    if (!moderationResult.isAllowed) {
      throw new BadRequestException('Room title contains inappropriate content. Please use a respectful title.');
    }

    const result = await db.execute(sql`
      INSERT INTO rooms (id, name, location, expires_at, is_system_room)
      VALUES (
        gen_random_uuid(),
        ${name},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        NOW() + interval '126 seconds',
        false
      )
      RETURNING id, name
    `);

    return result.rows[0];
  }

  /**
   * Create a user room with custom title
   * Maximum 2 user rooms allowed per area (5km radius)
   */
  async createUserRoom(
    title: string,
    lat: number,
    lng: number,
    createdBy: string,
  ) {
    // 🔒 STRICT CONTENT MODERATION for room title
    const moderationResult = contentModeration.checkMessage(title, 'confession'); // Use strictest level
    
    if (!moderationResult.isAllowed) {
      throw new BadRequestException('Room title contains inappropriate content. Please use a respectful title.');
    }

    const radiusMeters = 5000; // 5km radius

    // Check how many user rooms exist in the area
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM rooms
      WHERE expires_at > NOW()
        AND is_user_room = true
        AND ST_DWithin(
          location,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusMeters}
        )
    `);

    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount >= 2) {
      throw new BadRequestException('Maximum 2 user rooms allowed in this area');
    }

    // Create the user room
    const result = await db.execute(sql`
      INSERT INTO rooms (
        id, name, location, expires_at, is_system_room, is_user_room, created_by
      )
      VALUES (
        gen_random_uuid(),
        ${title},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + interval '2 hours'),
        false,
        true,
        ${createdBy}
      )
      RETURNING 
        id::text, 
        name, 
        created_by,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude,
        expires_at
    `);

    const newRoom = result.rows[0];
    this.logger.log(`User room created: "${title}" by ${createdBy} at (${lat}, ${lng})`);

    // Broadcast new room creation to all connected clients
    if (this.chatGateway && this.chatGateway.broadcastNewRoom) {
      this.chatGateway.broadcastNewRoom({
        id: newRoom.id,
        title: newRoom.name,
        createdBy: newRoom.created_by,
        latitude: newRoom.latitude,
        longitude: newRoom.longitude,
        distance: 0,
        expiresAt: newRoom.expires_at,
        type: 'custom',
        userCount: 0,
      });
    }

    return newRoom;
  }

  /**
   * Get user-created rooms in a specific area
   */
  async getUserRooms(lat: number, lng: number) {
    const radiusMeters = 5000; // 5km radius

    try {
      const result = await db.execute(sql`
        SELECT
          id::text,
          name AS title,
          created_by,
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude,
          ROUND(
            (ST_Distance(
              location,
              ST_MakePoint(${lng}, ${lat})::geography
            ) / 1000.0)::numeric, 1
          ) AS distance,
          created_at,
          expires_at
        FROM rooms
        WHERE expires_at > NOW()
          AND is_user_room = true
          AND ST_DWithin(
            location,
            ST_MakePoint(${lng}, ${lat})::geography,
            ${radiusMeters}
          )
        ORDER BY created_at DESC
      `);

      // Add active user count for each room
      const roomsWithUserCount = result.rows.map((room: any) => {
        const users = this.roomUsers.get(room.id);
        return {
          id: room.id,
          title: room.title,
          created_by: room.created_by,
          latitude: parseFloat(room.latitude),
          longitude: parseFloat(room.longitude),
          distance: parseFloat(room.distance),
          created_at: room.created_at,
          expires_at: room.expires_at ? new Date(room.expires_at + ' UTC').toISOString() : null,
          activeUserCount: users ? users.size : 0,
          isActive: true,
        };
      });

      this.logger.log(`Found ${roomsWithUserCount.length} user rooms near (${lat}, ${lng})`);
      return roomsWithUserCount;
    } catch (error) {
      this.logger.error(`Error getting user rooms: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check how many user rooms can still be created in an area
   */
  async getAvailableUserRoomSlots(lat: number, lng: number) {
    const radiusMeters = 5000;

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM rooms
      WHERE expires_at > NOW()
        AND is_user_room = true
        AND ST_DWithin(
          location,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusMeters}
        )
    `);

    const currentCount = parseInt(countResult.rows[0].count);
    return {
      used: currentCount,
      available: Math.max(0, 2 - currentCount),
      total: 2,
    };
  }

  /**
   * Create a system room with specific type and configuration
   */
  private async createSystemRoom(
    roomType: RoomType,
    lat: number,
    lng: number,
    cityName?: string,
  ) {
    const config = getRoomTypeConfig(roomType);
    const name = formatRoomName(config, cityName);
    const prompt = formatRoomPrompt(config, cityName);

    const result = await db.execute(sql`
      INSERT INTO rooms (
        id, name, location, expires_at, is_system_room, room_type, 
        city_name, active_hour_start, active_hour_end, prompt
      )
      VALUES (
        gen_random_uuid(),
        ${name},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        NOW() + interval '126 seconds',
        true,
        ${roomType},
        ${cityName || null},
        ${config.activeHourStart ?? null},
        ${config.activeHourEnd ?? null},
        ${prompt}
      )
      RETURNING id, name, room_type, prompt
    `);

    this.logger.log(`Created system room: ${name} (${roomType}) at (${lat}, ${lng})`);
    return result.rows[0];
  }

  /**
   * Find or create a system room of specific type within radius
   * Returns existing room if found, creates new one if not
   */
  private async findOrCreateSystemRoom(
    roomType: RoomType,
    lat: number,
    lng: number,
    cityName?: string,
  ) {
    const config = getRoomTypeConfig(roomType);
    const radiusMeters = config.radiusMeters; // Use custom radius from config

    // First, check if a room of this type exists within radius
    const existing = await db.execute(sql`
      SELECT
        id::text,
        name,
        room_type,
        prompt,
        ROUND(
          ST_Distance(
            location,
            ST_MakePoint(${lng}, ${lat})::geography
          )
        ) AS distance_in_meters
      FROM rooms
      WHERE expires_at > NOW()
        AND is_system_room = true
        AND room_type = ${roomType}
        AND ST_DWithin(
          location,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusMeters}
        )
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      this.logger.log(`Found existing ${roomType} room: ${existing.rows[0].name}`);
      return existing.rows[0];
    }

    // No existing room, create a new one
    this.logger.log(`No ${roomType} room found, creating new one...`);
    return await this.createSystemRoom(roomType, lat, lng, cityName);
  }

  /**
   * Discover all available system rooms for a user's location
   * Auto-creates rooms that don't exist
   */
  async discoverSystemRooms(
    lat: number,
    lng: number,
    cityName?: string,
  ): Promise<SystemRoom[]> {
    const rooms: SystemRoom[] = [];

    // Get all room types to check
    const roomTypes = Object.values(RoomType);

    for (const roomType of roomTypes) {
      const config = getRoomTypeConfig(roomType);
      const isActive = !config.isTimeSensitive || isRoomActiveNow(config);

      try {
        // For inactive time-sensitive rooms, find existing or create placeholder
        const room = await this.findOrCreateSystemRoom(
          roomType,
          lat,
          lng,
          cityName,
        );

        rooms.push({
          id: room.id,
          name: room.name,
          roomType: room.room_type,
          prompt: room.prompt,
          distance_in_meters: room.distance_in_meters || 0,
          isActive,
          activeHourStart: config.activeHourStart,
          activeHourEnd: config.activeHourEnd,
          isTimeSensitive: config.isTimeSensitive,
        });
        
        this.logger.debug(`${roomType} room - Active: ${isActive}`);
      } catch (error) {
        this.logger.error(`Error handling ${roomType} room:`, error);
      }
    }

    return rooms;
  }

  async findNearby(
    lat: number,
    lng: number,
  ) {
    const result = await db.execute(sql`
      SELECT
        id,
        name,
        ROUND(
          ST_Distance(
            location,
            ST_MakePoint(${lng}, ${lat})::geography
          )
        ) AS distance_in_meters
      FROM rooms
      WHERE expires_at > NOW()
        AND ST_DWithin(
          location,
          ST_MakePoint(${lng}, ${lat})::geography,
          5000
        )
      ORDER BY distance_in_meters ASC
    `);

    return result.rows;
  }

  async getNearbyActiveUserCount(
    lat: number,
    lng: number,
  ) {
    // Count all registered users globally
    // Note: Since users don't have stored locations, we count all registered users
    // To make this location-based, we'd need to add a location field to users table

    try {
      // Count all registered users (excluding banned users)
      const result = await db.execute(sql`
        SELECT COUNT(*) as user_count
        FROM users
        WHERE banned = false
      `);

      const totalUsers = parseInt(result.rows[0]?.user_count || 0);

      this.logger.log(`Total registered users: ${totalUsers}`);

      return { totalActiveUsers: totalUsers };
    } catch (error) {
      this.logger.error('Error counting users:', error);
      return { totalActiveUsers: 0 };
    }
  }

  /**
   * Get room details by ID
   */
  async getRoomDetails(roomId: string) {
    const result = await db.execute(sql`
      SELECT
        id::text,
        name,
        room_type,
        prompt,
        expires_at,
        is_system_room,
        is_user_room,
        created_by
      FROM rooms
      WHERE id = ${roomId}::uuid
        AND expires_at > NOW()
    `);

    if (result.rows.length === 0) {
      return null;
    }

    const room = result.rows[0];
    
    // Get user count
    const users = this.roomUsers.get(roomId);
    const userCount = users ? users.size : 0;

    // Convert expires_at to ISO string with timezone
    const expiresAtISO = room.expires_at ? new Date(room.expires_at + ' UTC').toISOString() : null;

    this.logger.log(`🕐 Raw expires_at from DB: ${room.expires_at}`);
    this.logger.log(`🕐 Converted to ISO: ${expiresAtISO}`);
    this.logger.log(`🕐 Current server time: ${new Date().toISOString()}`);

    return {
      id: room.id,
      name: room.name,
      roomType: room.room_type,
      prompt: room.prompt,
      expiresAt: expiresAtISO,
      isSystemRoom: room.is_system_room,
      isUserRoom: room.is_user_room,
      createdBy: room.created_by,
      userCount,
    };
  }

  /**
   * Delete a room when all users leave (only for user rooms)
   */
  async deleteEmptyRoom(roomId: string) {
    // Only delete user-created rooms, not system rooms
    const result = await db.execute(sql`
      DELETE FROM rooms
      WHERE id = ${roomId}::uuid
        AND is_user_room = true
      RETURNING id::text, name
    `);

    if (result.rows.length > 0) {
      this.logger.log(`Deleted empty user room: ${result.rows[0].name} (${roomId})`);
    }

    return result.rows[0] || null;
  }

  /**
   * Get messages for a specific room
   */
  async getMessages(roomId: string, limit: number = 100) {
    const result = await db.execute(sql`
      SELECT
        id::text,
        username,
        message,
        created_at
      FROM messages
      WHERE room_id = ${roomId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    // Return in ascending order (oldest first)
    return result.rows.reverse();
  }

  /**
   * Delete all user-created rooms (for cleanup/testing)
   */
  async deleteAllUserRooms() {
    try {
      // First delete messages
      await db.execute(sql`
        DELETE FROM messages 
        WHERE room_id IN (
          SELECT id FROM rooms WHERE is_user_room = true
        )
      `);

      // Then delete rooms
      const result = await db.execute(sql`
        DELETE FROM rooms 
        WHERE is_user_room = true
        RETURNING id::text, name
      `);

      this.logger.log(`Deleted ${result.rows.length} user rooms`);
      return { deleted: result.rows.length, rooms: result.rows };
    } catch (error) {
      this.logger.error('Error deleting user rooms:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired rooms
   */
  async cleanupExpiredRooms() {
    const result = await db.execute(sql`
      DELETE FROM rooms
      WHERE expires_at <= NOW()
      RETURNING id::text, name, is_user_room
    `);

    if (result.rows.length > 0) {
      this.logger.log(`Cleaned up ${result.rows.length} expired rooms`);
      
      // Notify connected users about deleted rooms
      for (const room of result.rows) {
        this.logger.log(`🗑️ Room expired and deleted: ${room.name} (${room.id})`);
        
        // Broadcast room expiration to all users in the room
        if (this.chatGateway && this.chatGateway.server) {
          this.chatGateway.server.to(room.id).emit('room-expired', {
            roomId: room.id,
            roomName: room.name,
            message: 'This room has expired and been deleted.',
          });
        }
        
        // Clear room users tracking
        this.roomUsers.delete(room.id);
      }
    }

    return result.rows;
  }

  /**
   * Delete a specific user room by ID
   * Only allows deletion of user-created rooms, not system rooms
   */
  async deleteUserRoom(roomId: string) {
    try {
      this.logger.log(`Attempting to delete user room: ${roomId}`);
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(roomId)) {
        throw new BadRequestException('Invalid room ID format');
      }

      const result = await db.execute(sql`
        DELETE FROM rooms
        WHERE id = ${roomId}::uuid
          AND is_user_room = true
        RETURNING id::text, name
      `);

      if (result.rows.length > 0) {
        this.logger.log(`Successfully deleted user room: ${result.rows[0].name} (${roomId})`);
        
        // Broadcast room closing to all users in the room
        if (this.chatGateway && this.chatGateway.server) {
          this.chatGateway.server.to(roomId).emit('room-closing', {
            roomId: roomId,
            roomName: result.rows[0].name,
            message: 'This room has been closed.',
          });
        }
        
        // Clear room users tracking
        this.roomUsers.delete(roomId);
        
        return { 
          message: 'Room deleted successfully',
          roomId: result.rows[0].id,
          roomName: result.rows[0].name
        };
      } else {
        this.logger.warn(`Room not found or already deleted: ${roomId}`);
        // Return success even if room doesn't exist (idempotent operation)
        return { 
          message: 'Room already deleted or not found',
          roomId: roomId
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting room ${roomId}:`, error.message, error.stack);
      throw new BadRequestException(`Failed to delete room: ${error.message}`);
    }
  }
}

