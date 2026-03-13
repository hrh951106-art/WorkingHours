import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { EmployeeInfoTabController } from './employee-info-tab.controller';
import { EmployeeInfoTabService } from './employee-info-tab.service';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [AccountModule],
  controllers: [HrController, EmployeeInfoTabController],
  providers: [HrService, EmployeeInfoTabService, PrismaService, DataScopeService],
  exports: [HrService, EmployeeInfoTabService],
})
export class HrModule {}
