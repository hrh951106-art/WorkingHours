import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HrModule } from './modules/hr/hr.module';
import { AccountModule } from './modules/account/account.module';
import { PunchModule } from './modules/punch/punch.module';
import { ShiftModule } from './modules/shift/shift.module';
import { CalculateModule } from './modules/calculate/calculate.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SystemModule } from './modules/system/system.module';
import { AllocationModule } from './modules/allocation/allocation.module';
import { DataScopeService } from './common/filters/data-scope.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    HrModule,
    AccountModule,
    PunchModule,
    ShiftModule,
    CalculateModule,
    AttendanceModule,
    SystemModule,
    AllocationModule,
  ],
  providers: [DataScopeService],
  exports: [DataScopeService],
})
export class AppModule {}
