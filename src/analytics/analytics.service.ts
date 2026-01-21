import { Injectable } from '@nestjs/common';
import { db } from '../db';
import { users, rooms, messages } from '../db/schema';
import { sql, desc, count, eq, gte, and } from 'drizzle-orm';

@Injectable()
export class AnalyticsService {
  async getOverview() {
    const [totalUsers] = await db
      .select({ count: count() })
      .from(users);

    const [activeRooms] = await db
      .select({ count: count() })
      .from(rooms)
      .where(gte(rooms.expiresAt, new Date()));

    const [totalMessages] = await db
      .select({ count: count() })
      .from(messages);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeUsersToday] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.lastLogin, oneDayAgo));

    const [messagesLast24h] = await db
      .select({ count: count() })
      .from(messages)
      .where(gte(messages.createdAt, oneDayAgo));

    const [systemRooms] = await db
      .select({ count: count() })
      .from(rooms)
      .where(eq(rooms.isSystemRoom, true));

    const [userRooms] = await db
      .select({ count: count() })
      .from(rooms)
      .where(eq(rooms.isUserRoom, true));

    return {
      totalUsers: totalUsers.count,
      activeRooms: activeRooms.count,
      totalMessages: totalMessages.count,
      activeUsersToday: activeUsersToday.count,
      messagesLast24h: messagesLast24h.count,
      systemRooms: systemRooms.count,
      userRooms: userRooms.count,
    };
  }

  async getUserStats(days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // New users per day
    const newUsersPerDay = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})`,
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, startDate))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    // Active users per day
    const activeUsersPerDay = await db
      .select({
        date: sql<string>`DATE(${users.lastLogin})`,
        count: count(),
      })
      .from(users)
      .where(gte(users.lastLogin, startDate))
      .groupBy(sql`DATE(${users.lastLogin})`)
      .orderBy(sql`DATE(${users.lastLogin})`);

    return {
      newUsersPerDay,
      activeUsersPerDay,
    };
  }

  async getRoomStats(days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Rooms created per day
    const roomsPerDay = await db
      .select({
        date: sql<string>`DATE(${rooms.createdAt})`,
        count: count(),
        systemRooms: sql<number>`SUM(CASE WHEN ${rooms.isSystemRoom} THEN 1 ELSE 0 END)`,
        userRooms: sql<number>`SUM(CASE WHEN ${rooms.isUserRoom} THEN 1 ELSE 0 END)`,
      })
      .from(rooms)
      .where(gte(rooms.createdAt, startDate))
      .groupBy(sql`DATE(${rooms.createdAt})`)
      .orderBy(sql`DATE(${rooms.createdAt})`);

    // Room types distribution
    const roomTypeDistribution = await db
      .select({
        roomType: rooms.roomType,
        count: count(),
      })
      .from(rooms)
      .where(and(eq(rooms.isSystemRoom, true), gte(rooms.createdAt, startDate)))
      .groupBy(rooms.roomType);

    return {
      roomsPerDay,
      roomTypeDistribution,
    };
  }

  async getMessageStats(days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Messages per day
    const messagesPerDay = await db
      .select({
        date: sql<string>`DATE(${messages.createdAt})`,
        count: count(),
      })
      .from(messages)
      .where(gte(messages.createdAt, startDate))
      .groupBy(sql`DATE(${messages.createdAt})`)
      .orderBy(sql`DATE(${messages.createdAt})`);

    // Average messages per room
    const avgMessagesPerRoom = await db
      .select({
        roomId: messages.roomId,
        messageCount: count(),
      })
      .from(messages)
      .where(gte(messages.createdAt, startDate))
      .groupBy(messages.roomId);

    const average = avgMessagesPerRoom.length > 0
      ? avgMessagesPerRoom.reduce((sum, room) => sum + Number(room.messageCount), 0) / avgMessagesPerRoom.length
      : 0;

    return {
      messagesPerDay,
      averageMessagesPerRoom: Math.round(average),
      totalRoomsWithMessages: avgMessagesPerRoom.length,
    };
  }

  async getEngagementMetrics() {
    // User engagement levels
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [activeLastWeek] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.lastLogin, sevenDaysAgo));

    const [activeLastMonth] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.lastLogin, thirtyDaysAgo));

    const [totalUsers] = await db
      .select({ count: count() })
      .from(users);

    // Top message senders
    const topMessageSenders = await db
      .select({
        username: messages.username,
        messageCount: count(),
      })
      .from(messages)
      .where(gte(messages.createdAt, thirtyDaysAgo))
      .groupBy(messages.username)
      .orderBy(desc(count()))
      .limit(10);

    return {
      weeklyActiveUsers: activeLastWeek.count,
      monthlyActiveUsers: activeLastMonth.count,
      totalUsers: totalUsers.count,
      weeklyRetention: totalUsers.count > 0 ? ((activeLastWeek.count / totalUsers.count) * 100).toFixed(2) : 0,
      monthlyRetention: totalUsers.count > 0 ? ((activeLastMonth.count / totalUsers.count) * 100).toFixed(2) : 0,
      topMessageSenders,
    };
  }

  async getUserActivity(limit: number = 50) {
    const recentUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        banned: users.banned,
        violationCount: users.violationCount,
      })
      .from(users)
      .orderBy(desc(users.lastLogin))
      .limit(limit);

    // Get message count for each user
    const usersWithActivity = await Promise.all(
      recentUsers.map(async (user) => {
        const [messageCount] = await db
          .select({ count: count() })
          .from(messages)
          .where(eq(messages.userId, user.id));

        return {
          ...user,
          messageCount: messageCount.count,
        };
      })
    );

    return usersWithActivity;
  }

  async getRoomPopularity() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const roomPopularity = await db
      .select({
        roomId: messages.roomId,
        roomName: rooms.name,
        roomType: rooms.roomType,
        isSystemRoom: rooms.isSystemRoom,
        messageCount: count(),
      })
      .from(messages)
      .innerJoin(rooms, eq(messages.roomId, rooms.id))
      .where(gte(messages.createdAt, thirtyDaysAgo))
      .groupBy(messages.roomId, rooms.name, rooms.roomType, rooms.isSystemRoom)
      .orderBy(desc(count()))
      .limit(20);

    return roomPopularity;
  }

  async getHourlyActivity() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const hourlyActivity = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${messages.createdAt})`,
        messageCount: count(),
      })
      .from(messages)
      .where(gte(messages.createdAt, sevenDaysAgo))
      .groupBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`);

    // Fill in missing hours with 0
    const hourlyMap = new Map(hourlyActivity.map(h => [Number(h.hour), Number(h.messageCount)]));
    const completeHourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      messageCount: hourlyMap.get(i) || 0,
    }));

    return completeHourlyData;
  }

  async getUserList(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
        banned: users.banned,
        banReason: users.banReason,
        violationCount: users.violationCount,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db
      .select({ count: count() })
      .from(users);

    // Get message count for each user
    const usersWithMessageCount = await Promise.all(
      userList.map(async (user) => {
        const [messageCount] = await db
          .select({ count: count() })
          .from(messages)
          .where(eq(messages.userId, user.id));

        return {
          ...user,
          messageCount: messageCount.count,
        };
      })
    );

    return {
      users: usersWithMessageCount,
      total: totalCount.count,
      page,
      limit,
      totalPages: Math.ceil(totalCount.count / limit),
    };
  }

  async banUser(userId: string, reason: string) {
    await db
      .update(users)
      .set({ banned: true, banReason: reason })
      .where(eq(users.id, userId));

    return { success: true, message: 'User banned successfully' };
  }

  async unbanUser(userId: string) {
    await db
      .update(users)
      .set({ banned: false, banReason: null })
      .where(eq(users.id, userId));

    return { success: true, message: 'User unbanned successfully' };
  }

  async getBannedUsers() {
    const bannedUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        anonymousName: users.anonymousName,
        banned: users.banned,
        banReason: users.banReason,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        violationCount: users.violationCount,
      })
      .from(users)
      .where(eq(users.banned, true))
      .orderBy(desc(users.lastLogin));

    return bannedUsers;
  }

  async getRecentActivity(limit: number = 100) {
    const recentMessages = await db
      .select({
        id: messages.id,
        message: messages.message,
        username: messages.username,
        roomId: messages.roomId,
        createdAt: messages.createdAt,
        userId: messages.userId,
      })
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Get room names
    const messagesWithRooms = await Promise.all(
      recentMessages.map(async (msg) => {
        const [room] = await db
          .select({ name: rooms.name })
          .from(rooms)
          .where(eq(rooms.id, msg.roomId));
        
        return {
          ...msg,
          roomName: room?.name || 'Unknown Room',
        };
      })
    );

    return messagesWithRooms;
  }
}
