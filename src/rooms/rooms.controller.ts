import { Controller, Post, Get, Body, Query } from '@nestjs/common';
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
}
