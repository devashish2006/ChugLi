import { Controller, Post, Get, Body, Query, Param, NotFoundException, Delete } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  createRoom(
    @Body('name') name: string,
    @Body('lat') lat: number,
    @Body('lng') lng: number,
  ) {
    return this.roomsService.createRoom(name, lat, lng);
  }

  /**
   * Create a user room with custom title
   * Maximum 2 user rooms per area
   */
  @Post('user')
  createUserRoom(
    @Body('title') title: string,
    @Body('lat') lat: number,
    @Body('lng') lng: number,
    @Body('createdBy') createdBy: string,
  ) {
    return this.roomsService.createUserRoom(title, lat, lng, createdBy);
  }

  /**
   * Get user-created rooms in a specific area
   */
  @Get('user')
  getUserRooms(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.roomsService.getUserRooms(Number(lat), Number(lng));
  }

  /**
   * Check how many user room slots are available in an area
   */
  @Get('user/slots')
  getAvailableUserRoomSlots(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.roomsService.getAvailableUserRoomSlots(Number(lat), Number(lng));
  }

  /**
   * Discover all available system rooms for user's location
   * Auto-creates rooms that don't exist within radius
   */
  @Get('discover')
  discoverSystemRooms(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('city') city?: string,
  ) {
    return this.roomsService.discoverSystemRooms(
      Number(lat),
      Number(lng),
      city,
    );
  }

  @Get('nearby')
  getNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.roomsService.findNearby(
      Number(lat),
      Number(lng),
    );
  }

  @Get('nearby/count')
  getNearbyActiveCount(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.roomsService.getNearbyActiveUserCount(
      Number(lat),
      Number(lng),
    );
  }

  /**
   * Get room details by ID
   */
  @Get(':roomId')
  async getRoomDetails(@Param('roomId') roomId: string) {
    const room = await this.roomsService.getRoomDetails(roomId);
    if (!room) {
      throw new NotFoundException('Room not found or has expired');
    }
    return room;
  }

  /**
   * Get messages for a specific room
   */
  @Get(':roomId/messages')
  getMessages(
    @Query('roomId') roomId: string,
    @Query('limit') limit?: string,
  ) {
    return this.roomsService.getMessages(roomId, limit ? Number(limit) : 100);
  }

  /**
   * Manual cleanup endpoint (can also be scheduled)
   */
  @Post('cleanup')
  cleanupExpiredRooms() {
    return this.roomsService.cleanupExpiredRooms();
  }

  /**
   * Delete all user rooms (for testing/cleanup)
   */
  @Post('user/cleanup')
  deleteAllUserRooms() {
    return this.roomsService.deleteAllUserRooms();
  }

  /**
   * Delete a specific user room by ID
   */
  @Delete('user/:roomId')
  async deleteUserRoom(@Param('roomId') roomId: string) {
    return this.roomsService.deleteUserRoom(roomId);
  }
}
