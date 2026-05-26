import { Module } from '@nestjs/common';
import { CalculateController } from './calculate.controller';
import { CalculateService } from './calculate.service';
import { CalculateEngine } from './calculate.engine';
import { AttendanceCodeController } from './attendance-code.controller';
import { AttendanceCodeService } from './attendance-code.service';
import { AttendanceCodeDefinitionController } from './attendance-code-definition.controller';
import { AttendanceCodeDefinitionService } from './attendance-code-definition.service';
import { CalculationAttendanceCodeController } from './calculation-attendance-code.controller';
import { CalculationAttendanceCodeService } from './calculation-attendance-code.service';
import { WorkHourPushService } from './work-hour-push.service';
import { AttendanceWorkHourService } from './attendance-work-hour.service';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import { AttendanceRuleGroupModule } from '../attendance-rule-group/attendance-rule-group.module';
import { AmountModule } from '../amount/amount.module';

@Module({
  imports: [AttendanceRuleGroupModule, AmountModule],
  controllers: [
    CalculateController,
    AttendanceCodeController,
    AttendanceCodeDefinitionController,
    CalculationAttendanceCodeController,
  ],
  providers: [
    CalculateService,
    CalculateEngine,
    AttendanceCodeService,
    AttendanceCodeDefinitionService,
    CalculationAttendanceCodeService,
    WorkHourPushService,
    AttendanceWorkHourService, // ✅ 新增：考勤工时计算服务
    PrismaService,
    DataScopeService,
  ],
  exports: [
    CalculateService,
    AttendanceCodeService,
    AttendanceCodeDefinitionService,
    CalculationAttendanceCodeService,
    AttendanceWorkHourService, // ✅ 新增：导出考勤工时计算服务
  ],
})
export class CalculateModule {}
