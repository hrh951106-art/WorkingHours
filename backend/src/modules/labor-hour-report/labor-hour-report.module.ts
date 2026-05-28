import { Module } from '@nestjs/common';
import { LaborHourReportService } from './labor-hour-report.service';
import { LaborHourReportController } from './labor-hour-report.controller';
import { PrismaModule } from '../../database/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { AmountModule } from '../amount/amount.module';

@Module({
  imports: [PrismaModule, WorkflowModule, AmountModule],
  controllers: [LaborHourReportController],
  providers: [LaborHourReportService],
  exports: [LaborHourReportService],
})
export class LaborHourReportModule {}
