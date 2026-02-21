import { Injectable } from '@nestjs/common';
import { db } from '../db';
import { users, rooms, messages } from '../db/schema';
import { sql, desc, count, eq, gte, and, lt } from 'drizzle-orm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class AnalyticsService {
  constructor(private chatGateway: ChatGateway) {}
  // Check every hour for users who should be unbanned
  @Cron(CronExpression.EVERY_HOUR)
  async autoUnbanUsers() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await db
      .update(users)
      .set({ 
        banned: false, 
        banReason: null, 
        bannedAt: null 
      })
      .where(
        and(
          eq(users.banned, true),
          lt(users.bannedAt, twentyFourHoursAgo)
        )
      )
      .returning({ id: users.id });

    if (result.length > 0) {
      console.log(`✅ Auto-unbanned ${result.length} user(s) after 24 hours`);
    }
  }

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

  // Public stats for sharing with users
  async getPublicStats() {
    const [totalUsers] = await db
      .select({ count: count() })
      .from(users);

    const [totalMessages] = await db
      .select({ count: count() })
      .from(messages);

    const [activeRooms] = await db
      .select({ count: count() })
      .from(rooms)
      .where(gte(rooms.expiresAt, new Date()));

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [messagesLast24h] = await db
      .select({ count: count() })
      .from(messages)
      .where(gte(messages.createdAt, oneDayAgo));

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [messagesLastWeek] = await db
      .select({ count: count() })
      .from(messages)
      .where(gte(messages.createdAt, oneWeekAgo));

    const [activeUsersToday] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.lastLogin, oneDayAgo));

    // Messages per day for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const messagesPerDay = await db
      .select({
        date: sql<string>`DATE(${messages.createdAt})`,
        count: count(),
      })
      .from(messages)
      .where(gte(messages.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${messages.createdAt})`)
      .orderBy(sql`DATE(${messages.createdAt})`);

    // Most popular room types
    const popularRoomTypes = await db
      .select({
        roomType: rooms.roomType,
        count: count(),
      })
      .from(messages)
      .innerJoin(rooms, eq(messages.roomId, rooms.id))
      .where(and(
        eq(rooms.isSystemRoom, true),
        gte(messages.createdAt, thirtyDaysAgo)
      ))
      .groupBy(rooms.roomType)
      .orderBy(desc(count()))
      .limit(5);

    // Peak activity hours
    const hourlyActivity = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${messages.createdAt})`,
        count: count(),
      })
      .from(messages)
      .where(gte(messages.createdAt, oneWeekAgo))
      .groupBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`)
      .orderBy(desc(count()))
      .limit(3);

    return {
      totalUsers: totalUsers.count,
      totalMessages: totalMessages.count,
      activeRooms: activeRooms.count,
      messagesLast24h: messagesLast24h.count,
      messagesLastWeek: messagesLastWeek.count,
      activeUsersToday: activeUsersToday.count,
      messagesPerDay,
      popularRoomTypes,
      peakHours: hourlyActivity.map(h => Math.floor(Number(h.hour))),
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
        bannedAt: users.bannedAt,
        violationCount: users.violationCount,
        // New tracking fields
        loginCount: users.loginCount,
        totalSessions: users.totalSessions,
        averageSessionDuration: users.averageSessionDuration,
        firstLoginDate: users.firstLoginDate,
        lastActivityAt: users.lastActivityAt,
        preferredRoomTypes: users.preferredRoomTypes,
        totalRoomsCreated: users.totalRoomsCreated,
        totalRoomsJoined: users.totalRoomsJoined,
        isOnline: users.isOnline,
        lastSeenAt: users.lastSeenAt,
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

        // Calculate days since first login
        const daysSinceJoined = Math.floor(
          (Date.now() - new Date(user.firstLoginDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate engagement score (messages per day since joining)
        const engagementScore = daysSinceJoined > 0 
          ? (Number(messageCount.count) / daysSinceJoined).toFixed(2)
          : messageCount.count;

        return {
          ...user,
          messageCount: messageCount.count,
          daysSinceJoined,
          engagementScore: parseFloat(engagementScore as string),
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
        bannedAt: users.bannedAt,
        violationCount: users.violationCount,
        // New tracking fields
        loginCount: users.loginCount,
        totalSessions: users.totalSessions,
        averageSessionDuration: users.averageSessionDuration,
        firstLoginDate: users.firstLoginDate,
        lastActivityAt: users.lastActivityAt,
        preferredRoomTypes: users.preferredRoomTypes,
        totalRoomsCreated: users.totalRoomsCreated,
        totalRoomsJoined: users.totalRoomsJoined,
        isOnline: users.isOnline,
        lastSeenAt: users.lastSeenAt,
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

        // Calculate days since first login
        const daysSinceJoined = Math.floor(
          (Date.now() - new Date(user.firstLoginDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate engagement score
        const engagementScore = daysSinceJoined > 0 
          ? (Number(messageCount.count) / daysSinceJoined).toFixed(2)
          : messageCount.count;

        return {
          ...user,
          messageCount: messageCount.count,
          daysSinceJoined,
          engagementScore: parseFloat(engagementScore as string),
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
    const bannedAt = new Date();
    
    await db
      .update(users)
      .set({ banned: true, banReason: reason, bannedAt: bannedAt })
      .where(eq(users.id, userId));

    // Notify the user via WebSocket if they're connected
    this.chatGateway.notifyUserBanned(userId, reason, bannedAt);

    return { success: true, message: 'User banned successfully' };
  }

  async unbanUser(userId: string) {
    await db
      .update(users)
      .set({ banned: false, banReason: null, bannedAt: null })
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
        bannedAt: users.bannedAt,
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

  async getUserDetails(userId: string) {
    // Get user basic info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    // Get message stats
    const [messageStats] = await db
      .select({
        totalMessages: count(),
      })
      .from(messages)
      .where(eq(messages.userId, userId));

    // Get messages per day for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const messageHistory = await db
      .select({
        date: sql<string>`DATE(${messages.createdAt})`,
        count: count(),
      })
      .from(messages)
      .where(and(
        eq(messages.userId, userId),
        gte(messages.createdAt, thirtyDaysAgo)
      ))
      .groupBy(sql`DATE(${messages.createdAt})`)
      .orderBy(sql`DATE(${messages.createdAt})`);

    // Get favorite rooms (most active in)
    const favoriteRooms = await db
      .select({
        roomId: messages.roomId,
        roomName: rooms.name,
        roomType: rooms.roomType,
        messageCount: count(),
      })
      .from(messages)
      .innerJoin(rooms, eq(messages.roomId, rooms.id))
      .where(eq(messages.userId, userId))
      .groupBy(messages.roomId, rooms.name, rooms.roomType)
      .orderBy(desc(count()))
      .limit(5);

    // Get activity by hour
    const activityByHour = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${messages.createdAt})`,
        count: count(),
      })
      .from(messages)
      .where(eq(messages.userId, userId))
      .groupBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`);

    // Get recent messages
    const recentMessages = await db
      .select({
        id: messages.id,
        message: messages.message,
        roomId: messages.roomId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    // Get room info for recent messages
    const recentMessagesWithRooms = await Promise.all(
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

    // Calculate engagement metrics
    const daysSinceJoined = Math.floor(
      (Date.now() - new Date(user.firstLoginDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const messagesPerDay = daysSinceJoined > 0 
      ? parseFloat((Number(messageStats.totalMessages) / daysSinceJoined).toFixed(2))
      : Number(messageStats.totalMessages);

    return {
      user: {
        ...user,
        daysSinceJoined,
        messagesPerDay,
      },
      stats: {
        totalMessages: messageStats.totalMessages,
        messageHistory,
        favoriteRooms,
        activityByHour,
      },
      recentActivity: recentMessagesWithRooms,
    };
  }

  async getOnlineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        lastSeenAt: users.lastSeenAt,
        isOnline: users.isOnline,
      })
      .from(users)
      .where(
        and(
          eq(users.banned, false),
          gte(users.lastSeenAt, fiveMinutesAgo)
        )
      )
      .orderBy(desc(users.lastSeenAt))
      .limit(50);

    return onlineUsers;
  }
}
