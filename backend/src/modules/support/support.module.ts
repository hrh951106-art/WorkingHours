import { Module } from '@nestjs/common';
import { SupportRequestController } from './support-request.controller';
import { SupportRequestService } from './support-request.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [SupportRequestController],
  providers: [SupportRequestService, PrismaService],
  exports: [SupportRequestService],
})
export class SupportModule {}
