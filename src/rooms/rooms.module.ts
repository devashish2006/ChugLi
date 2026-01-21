import { Module, forwardRef } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomCleanupService } from './room-cleanup.service';

@Module({
  imports: [forwardRef(() => require('../chat/chat.module').ChatModule)],
  controllers: [RoomsController],
  providers: [RoomsService, RoomCleanupService],
  exports: [RoomsService],
})
export class RoomsModule {}   // 🔥 named export
