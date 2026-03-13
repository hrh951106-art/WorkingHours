import { Module } from '@nestjs/common';
import { CalculateController } from './calculate.controller';
import { CalculateService } from './calculate.service';
import { CalculateEngine } from './calculate.engine';
import { AttendanceCodeController } from './attendance-code.controller';
import { AttendanceCodeService } from './attendance-code.service';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';

@Module({
  controllers: [CalculateController, AttendanceCodeController],
  providers: [CalculateService, CalculateEngine, AttendanceCodeService, PrismaService, DataScopeService],
  exports: [CalculateService, AttendanceCodeService],
})
export class CalculateModule {}
