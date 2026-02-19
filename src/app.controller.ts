import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return {status:'ok', app:"chugLi backed"}
  }

  @Post('migrate')
  async runMigration() {
    return this.appService.runBannedAtMigration();
  }
}
