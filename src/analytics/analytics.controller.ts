import { Controller, Get, UseGuards, Query, Post, Body, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('users')
  async getUserStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getUserStats(daysNum);
  }

  @Get('rooms')
  async getRoomStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getRoomStats(daysNum);
  }

  @Get('messages')
  async getMessageStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getMessageStats(daysNum);
  }

  @Get('engagement')
  async getEngagementMetrics() {
    return this.analyticsService.getEngagementMetrics();
  }

  @Get('user-activity')
  async getUserActivity(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.analyticsService.getUserActivity(limitNum);
  }

  @Get('room-popularity')
  async getRoomPopularity() {
    return this.analyticsService.getRoomPopularity();
  }

  @Get('hourly-activity')
  async getHourlyActivity() {
    return this.analyticsService.getHourlyActivity();
  }

  @Get('user-list')
  async getUserList(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    return this.analyticsService.getUserList(pageNum, limitNum);
  }

  @Post('ban-user/:userId')
  async banUser(@Param('userId') userId: string, @Body('reason') reason: string) {
    return this.analyticsService.banUser(userId, reason);
  }

  @Post('unban-user/:userId')
  async unbanUser(@Param('userId') userId: string) {
    return this.analyticsService.unbanUser(userId);
  }

  @Get('banned-users')
  async getBannedUsers() {
    return this.analyticsService.getBannedUsers();
  }

  @Get('recent-activity')
  async getRecentActivity(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 100;
    return this.analyticsService.getRecentActivity(limitNum);
  }
}
