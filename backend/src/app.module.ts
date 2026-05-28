import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HrModule } from './modules/hr/hr.module';
import { AccountModule } from './modules/account/account.module';
import { SystemModule } from './modules/system/system.module';
import { PunchModule } from './modules/punch/punch.module';
import { ShiftModule } from './modules/shift/shift.module';
import { CalculateModule } from './modules/calculate/calculate.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AllocationModule } from './modules/allocation/allocation.module';
// import { WorkflowModule } from './modules/workflow/workflow.module';
import { SupportModule } from './modules/support/support.module';
// import { ProductionReportModule } from './modules/report/production-report.module';
import { AmountModule } from './modules/amount/amount.module';
import { AttendanceRuleGroupModule } from './modules/attendance-rule-group/attendance-rule-group.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { LaborHourReportModule } from './modules/labor-hour-report/labor-hour-report.module';
// import { BiReportModule } from './modules/bi-report/bi-report.module';
// import { AttendanceDashboardModule } from './modules/attendance-dashboard/attendance-dashboard.module';
import { DataScopeService } from './common/filters/data-scope.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    HrModule,
    AccountModule,
    SystemModule,
    PunchModule,
    ShiftModule,
    CalculateModule,
    AttendanceModule,
    AllocationModule,
    // WorkflowModule,
    SupportModule,
    // ProductionReportModule,
    // AmountModule, // AmountModule is imported by WorkflowModule
    AttendanceRuleGroupModule,
    WorkflowModule,
    LaborHourReportModule,
    // BiReportModule,
    // AttendanceDashboardModule,
  ],
  providers: [
    DataScopeService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [DataScopeService],
})
export class AppModule {}
