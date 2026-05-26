import { Module } from '@nestjs/common';
import { AttendanceRuleGroupController } from './attendance-rule-group.controller';
import { AttendanceRuleGroupService } from './attendance-rule-group.service';
import { AttendanceRuleGroupHelper } from './attendance-rule-group-helper.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceRuleGroupController],
  providers: [AttendanceRuleGroupService, AttendanceRuleGroupHelper],
  exports: [AttendanceRuleGroupService, AttendanceRuleGroupHelper],
})
export class AttendanceRuleGroupModule {}
