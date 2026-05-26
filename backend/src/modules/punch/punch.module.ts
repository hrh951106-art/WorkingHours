import { Module } from '@nestjs/common';
import { PunchController } from './punch.controller';
import { PunchService } from './punch.service';
import { PairingService } from './pairing.service';
import { AccountMergeService } from './account-merge.service';
import { PunchIntervalFilterService } from './punch-interval-filter.service';
import { PunchCollectionRangeService } from './punch-collection-range.service';
import { PunchPairingService } from './punch-pairing.service';
import { ShiftJunctionService } from './shift-junction.service';
import { AttendancePunchService } from './attendance-punch.service';
import { AttendancePunchTriggerService } from './attendance-punch-trigger.service';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import { CalculateModule } from '../calculate/calculate.module';
import { AttendanceRuleGroupModule } from '../attendance-rule-group/attendance-rule-group.module';

@Module({
  imports: [CalculateModule, AttendanceRuleGroupModule],
  controllers: [PunchController],
  providers: [
    PunchService,
    PairingService,
    AccountMergeService,
    PunchIntervalFilterService,
    PunchCollectionRangeService,
    PunchPairingService,
    ShiftJunctionService,
    AttendancePunchService,
    AttendancePunchTriggerService,
    PrismaService,
    DataScopeService,
  ],
  exports: [
    PunchService,
    PairingService,
    AccountMergeService,
    PunchIntervalFilterService,
    PunchCollectionRangeService,
    PunchPairingService,
    ShiftJunctionService,
    AttendancePunchService,
    AttendancePunchTriggerService,
  ],
})
export class PunchModule {}
