import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { generateAnonymousName } from 'src/utils/anonymous-name';
import { RoomsService } from 'src/rooms/rooms.service';
import { db } from 'src/db';
import { messages, users } from 'src/db/schema';
import { sql, eq } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt';
import { contentModeration } from 'src/utils/content-moderation';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayDisconnect, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private roomsService: RoomsService,
    private jwtService: JwtService,
  ) {}

  // Map socket ID to authenticated user ID
  private socketToUser = new Map<string, string>();

  // Use shared roomUsers from RoomsService
  private get roomUsers() {
    return this.roomsService.getRoomUsers();
  }

  // 🔥 roomId -> (socketId -> message stats)
  private messageStats = new Map<
    string,
    Map<string, { count: number; cooldownUntil?: number }>
  >();

  // ======================
  // BROADCAST ROOM CREATION TO NEARBY USERS
  // ======================
  broadcastNewRoom(roomData: any) {
    console.log('📢 Broadcasting new room creation:', roomData);
    // Broadcast to all connected clients
    // Clients will filter based on their location
    this.server.emit('new-room-created', roomData);
  }

  // ======================
  // CONNECTION HANDLER
  // ======================
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        console.log('❌ Client connected without token:', client.id);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      
      // Check if user exists and is not banned
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (userRecords.length === 0 || userRecords[0].banned) {
        console.log('❌ Invalid or banned user:', payload.sub);
        client.disconnect();
        return;
      }

      // Store user mapping
      this.socketToUser.set(client.id, payload.sub);
      console.log('✅ Authenticated user connected:', client.id, '→', payload.sub);
      
    } catch (error) {
      // Silently disconnect clients with invalid tokens (e.g., after server restart)
      client.disconnect();
    }
  }

  // ======================
  // JOIN ROOM
  // ======================
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;

    client.join(roomId);

    // Init room user map
    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Map());
    }

    // Init room message stats map
    if (!this.messageStats.has(roomId)) {
      this.messageStats.set(roomId, new Map());
    }

    const roomUsersMap = this.roomUsers.get(roomId)!;
    const stats = this.messageStats.get(roomId)!;

    // Get authenticated user's persistent anonymous name
    const userId = this.socketToUser.get(client.id);
    let username = generateAnonymousName(); // fallback
    
    if (userId) {
      try {
        const userRecords = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (userRecords.length > 0 && userRecords[0].anonymousName) {
          username = userRecords[0].anonymousName;
        }
      } catch (error) {
        console.error('Error fetching user anonymous name:', error);
      }
    }
    
    roomUsersMap.set(client.id, username);

    // Init message stats for user
    stats.set(client.id, { count: 0 });

    // Send identity only to this user
    client.emit('your-identity', { username });

    // Broadcast live user count to EVERYONE in the room (including the new joiner)
    const userCount = roomUsersMap.size;
    console.log(`📊 Broadcasting user count for room ${roomId}: ${userCount} users`);
    this.server.to(roomId).emit('user-count', userCount);
    
    // Also send to the client directly to ensure they get it
    client.emit('user-count', userCount);

    // Broadcast user joined to others (not to self)
    client.to(roomId).emit('user-joined', { username });
  }

  // ======================
  // LEAVE ROOM
  // ======================
  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;

    // Remove user from room
    const users = this.roomUsers.get(roomId);
    if (users) {
      const username = users.get(client.id);
      users.delete(client.id);
      
      // Clean up stats
      this.messageStats.get(roomId)?.delete(client.id);

      // Broadcast user left notification before cleanup
      if (username) {
        console.log(`👋 User ${username} left room ${roomId}`);
        this.server.to(roomId).emit('user-left', { username });
      }

      // If room is empty, delete it (only user rooms)
      if (users.size === 0) {
        console.log(`🗑️ Room ${roomId} is empty, checking if it should be deleted`);
        const deletedRoom = await this.roomsService.deleteEmptyRoom(roomId);
        if (deletedRoom) {
          console.log(`✅ Deleted empty user room: ${deletedRoom.name} (${roomId})`);
          // Notify all clients in room that it's closing
          this.server.to(roomId).emit('room-closing', {
            message: 'This room has been closed as all users have left',
          });
        }
        this.roomUsers.delete(roomId);
        this.messageStats.delete(roomId);
      } else {
        console.log(`📊 Room ${roomId} now has ${users.size} user(s)`);
        // Check if only one user left in a user room
        if (users.size === 1) {
          // Check if this is a user-created room
          const roomDetails = await this.roomsService.getRoomDetails(roomId);
          if (roomDetails && roomDetails.isUserRoom) {
            console.log(`⚠️ Last user in room ${roomId}, sending warning`);
            // Notify the last user
            this.server.to(roomId).emit('last-user-warning', {
              message: 'You are the last person in this room. The room will be deleted when you leave.',
            });
          }
        }
        // Broadcast updated user count
        this.server.to(roomId).emit('user-count', users.size);
      }
    }

    // Leave the Socket.IO room
    client.leave(roomId);
  }

  // ======================
  // SEND MESSAGE (with slow mode + content moderation)
  // ======================
  @SubscribeMessage('send-message')
  async handleMessage(
    @MessageBody() data: { roomId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, message } = data;

    const users = this.roomUsers.get(roomId);
    const statsMap = this.messageStats.get(roomId);

    if (!users || !statsMap) return;

    const username = users.get(client.id);
    const stats = statsMap.get(client.id);

    if (!username || !stats) return;

    const now = Date.now();

    // 🔒 CONTENT MODERATION CHECK
    // Get room type for strictness level
    let roomType: string | undefined;
    try {
      const roomDetails = await this.roomsService.getRoomDetails(roomId);
      roomType = roomDetails?.roomType;
    } catch (error) {
      // If room details fetch fails, use default moderation
      roomType = undefined;
    }

    const moderationResult = contentModeration.checkMessage(message, roomType);
    
    if (!moderationResult.isAllowed) {
      // 🔥 INCREMENT VIOLATION COUNT FOR THE USER
      const userId = this.socketToUser.get(client.id);
      if (userId) {
        try {
          await db.execute(sql`
            UPDATE users 
            SET violation_count = violation_count + 1 
            WHERE id = ${userId}::uuid
          `);
          console.log(`⚠️ Incremented violation count for user ${userId}`);
        } catch (error) {
          console.error('Error updating violation count:', error);
        }
      }
      
      // Determine moderation level for warning message
      let moderationLevel: 'strict' | 'moderate' | 'relaxed' = 'moderate';
      if (roomType === 'confession') {
        moderationLevel = 'strict';
      } else if (roomType === 'hostel' || roomType === 'matchday') {
        moderationLevel = 'relaxed';
      }
      
      // Send warning to sender only - silent, no broadcasting
      const warningMessage = contentModeration.getWarningMessage(moderationLevel as any);
      
      client.emit('message-blocked', {
        message: warningMessage,
        reason: moderationResult.reason,
      });
      
      console.log(`🚫 Message blocked from ${username} in room ${roomId}: ${moderationResult.reason}`);
      return; // Stop here, don't broadcast
    }

    //  Slow mode check
    if (stats.cooldownUntil && now < stats.cooldownUntil) {
      const secondsLeft = Math.ceil(
        (stats.cooldownUntil - now) / 1000,
      );

      client.emit('slow-mode', { secondsLeft });
      return;
    }

    //  Allow message
    stats.count += 1;

    // 🔥 Trigger slow mode after 5 messages
    if (stats.count >= 5) {
      stats.count = 0;
      stats.cooldownUntil = now + 10_000; // 10 seconds

      client.emit('slow-mode', { secondsLeft: 10 });
    }

    const messageData = {
      username,
      message,
      time: new Date(),
    };

    // Get authenticated user ID
    const userId = this.socketToUser.get(client.id);

    // Save message to database
    try {
      await db.execute(sql`
        INSERT INTO messages (room_id, username, message, created_at, user_id)
        VALUES (${roomId}::uuid, ${username}, ${message}, ${messageData.time}, ${userId}::uuid)
      `);
    } catch (error) {
      console.error('Error saving message:', error);
    }

    // Broadcast to EVERYONE in the room including sender
    // The client joined the room, so they will receive this
    this.server.to(roomId).emit('new-message', messageData);
  }

  @SubscribeMessage('typing')
handleTyping(
  @MessageBody() data: { roomId: string },
  @ConnectedSocket() client: Socket,
) {
  client.to(data.roomId).emit('someone-typing');
}


  // ======================
  // DISCONNECT CLEANUP
  // ======================
  async handleDisconnect(client: Socket) {
    // Clean up socket to user mapping
    this.socketToUser.delete(client.id);

    const roomsToDelete: string[] = [];
    
    for (const [roomId, users] of this.roomUsers.entries()) {
      if (users.has(client.id)) {
        const username = users.get(client.id);
        users.delete(client.id);
        this.messageStats.get(roomId)?.delete(client.id);

        // Broadcast user left notification
        if (username) {
          console.log(`👋 User ${username} disconnected from room ${roomId}`);
          this.server.to(roomId).emit('user-left', { username });
        }

        if (users.size === 0) {
          roomsToDelete.push(roomId);
        } else {
          console.log(`📊 Room ${roomId} now has ${users.size} user(s) after disconnect`);
          // Check if only one user left in a user room
          if (users.size === 1) {
            const roomDetails = await this.roomsService.getRoomDetails(roomId);
            if (roomDetails && roomDetails.isUserRoom) {
              console.log(`⚠️ Last user in room ${roomId} after disconnect, sending warning`);
              this.server.to(roomId).emit('last-user-warning', {
                message: 'You are the last person in this room. The room will be deleted when you leave.',
              });
            }
          }
          this.server.to(roomId).emit('user-count', users.size);
        }
      }
    }

    // Delete empty user rooms
    for (const roomId of roomsToDelete) {
      console.log(`🗑️ Deleting empty room ${roomId} after disconnect`);
      const deletedRoom = await this.roomsService.deleteEmptyRoom(roomId);
      if (deletedRoom) {
        console.log(`✅ Deleted empty user room: ${deletedRoom.name} (${roomId})`);
        // Notify any remaining clients that room is closing
        this.server.to(roomId).emit('room-closing', {
          message: 'This room has been closed as all users have left',
        });
      }
      this.roomUsers.delete(roomId);
      this.messageStats.delete(roomId);
    }
  }
}
