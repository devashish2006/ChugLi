import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Injectable()
export class RoomCleanupService implements OnModuleInit {
  private readonly logger = new Logger(RoomCleanupService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly roomsService: RoomsService) {}

  onModuleInit() {
    this.startCleanupSchedule();
  }

  /**
   * Start automatic cleanup every 5 minutes
   */
  startCleanupSchedule() {
    this.logger.log('Starting room cleanup scheduler (every 5 minutes)...');
    
    // Run cleanup immediately on startup
    this.performCleanup();

    // Then run every 5 minutes for more frequent cleanup of 2-hour rooms
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async performCleanup() {
    try {
      this.logger.log('Running scheduled room cleanup...');
      const cleaned = await this.roomsService.cleanupExpiredRooms();
      
      if (cleaned.length > 0) {
        this.logger.log(`Cleanup completed: ${cleaned.length} rooms removed`);
      }
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }

  stopCleanupSchedule() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log('Room cleanup scheduler stopped');
    }
  }
}
