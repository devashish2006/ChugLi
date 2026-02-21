import { Controller, Get, UseGuards, Query, Post, Body, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Public endpoint for shareable stats
  @Get('public-stats')
  async getPublicStats() {
    return this.analyticsService.getPublicStats();
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getUserStats(daysNum);
  }

  @Get('rooms')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getRoomStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getRoomStats(daysNum);
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getMessageStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getMessageStats(daysNum);
  }

  @Get('engagement')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getEngagementMetrics() {
    return this.analyticsService.getEngagementMetrics();
  }

  @Get('user-activity')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserActivity(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.analyticsService.getUserActivity(limitNum);
  }

  @Get('room-popularity')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getRoomPopularity() {
    return this.analyticsService.getRoomPopularity();
  }

  @Get('hourly-activity')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getHourlyActivity() {
    return this.analyticsService.getHourlyActivity();
  }

  @Get('user-list')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserList(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    return this.analyticsService.getUserList(pageNum, limitNum);
  }

  @Post('ban-user/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async banUser(@Param('userId') userId: string, @Body('reason') reason: string) {
    return this.analyticsService.banUser(userId, reason);
  }

  @Post('unban-user/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async unbanUser(@Param('userId') userId: string) {
    return this.analyticsService.unbanUser(userId);
  }

  @Get('banned-users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getBannedUsers() {
    return this.analyticsService.getBannedUsers();
  }

  @Get('recent-activity')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getRecentActivity(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 100;
    return this.analyticsService.getRecentActivity(limitNum);
  }

  @Get('user-details/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserDetails(@Param('userId') userId: string) {
    return this.analyticsService.getUserDetails(userId);
  }

  @Get('online-users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getOnlineUsers() {
    return this.analyticsService.getOnlineUsers();
  }
}
