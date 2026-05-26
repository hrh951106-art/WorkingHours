import { Module } from '@nestjs/common';
import { ShiftController } from './shift.controller';
import { ShiftService } from './shift.service';
import { ShiftPropertyDefinitionService } from './shift-property-definition.service';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
// import { PunchModule } from '../punch/punch.module'; // TODO: Temporarily disabled

@Module({
  imports: [], // TODO: PunchModule temporarily disabled
  controllers: [ShiftController],
  providers: [ShiftService, ShiftPropertyDefinitionService, PrismaService, DataScopeService],
  exports: [ShiftService],
})
export class ShiftModule {}
