import { Module } from '@nestjs/common';
import { BiReportController } from './bi-report.controller';
import { BiReportService } from './bi-report.service';
import { DataModelService } from './data-model.service';
import { BiReportConfigService } from './bi-report-config.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BiReportController],
  providers: [
    BiReportService,
    DataModelService,
    BiReportConfigService,
  ],
  exports: [
    BiReportService,
    DataModelService,
    BiReportConfigService,
  ],
})
export class BiReportModule {}
