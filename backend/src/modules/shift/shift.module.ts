import { Module } from '@nestjs/common';
import { ShiftController } from './shift.controller';
import { ShiftService } from './shift.service';
import { ShiftPropertyDefinitionService } from './shift-property-definition.service';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import { PunchModule } from '../punch/punch.module';

@Module({
  imports: [PunchModule],
  controllers: [ShiftController],
  providers: [ShiftService, ShiftPropertyDefinitionService, PrismaService, DataScopeService],
  exports: [ShiftService],
})
export class ShiftModule {}
