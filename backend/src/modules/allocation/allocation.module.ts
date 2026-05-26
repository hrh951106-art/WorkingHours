import { Module } from '@nestjs/common';
import { AllocationController } from './allocation.controller';
import { EarnedHoursAllocationController } from './earned-hours-allocation.controller';
import { AllocationService } from './allocation.service';
import { EarnedHoursAllocationService } from './earned-hours-allocation.service';
import { DefinitionAttendanceCodeController } from './definition-attendance-code.controller';
import { DefinitionAttendanceCodeService } from './definition-attendance-code.service';
import { WorkHourReceiverController } from './work-hour-receiver.controller';
import { WorkHourReceiverService } from './work-hour-receiver.service';
import { AllocationScopeService } from './allocation-scope.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [
    AllocationController,
    EarnedHoursAllocationController,
    DefinitionAttendanceCodeController,
    WorkHourReceiverController,
  ],
  providers: [
    AllocationService,
    EarnedHoursAllocationService,
    DefinitionAttendanceCodeService,
    WorkHourReceiverService,
    AllocationScopeService,
    PrismaService,
  ],
  exports: [
    AllocationService,
    DefinitionAttendanceCodeService,
    WorkHourReceiverService,
    AllocationScopeService,
  ],
})
export class AllocationModule {}
