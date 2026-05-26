import { Module } from '@nestjs/common';
import { AttendanceDashboardController } from './attendance-dashboard.controller';
import { AttendanceDashboardService } from './attendance-dashboard.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceDashboardController],
  providers: [AttendanceDashboardService],
  exports: [AttendanceDashboardService],
})
export class AttendanceDashboardModule {}
