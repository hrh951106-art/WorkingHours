import { Module } from '@nestjs/common';
import { PunchController } from './punch.controller';
import { PunchService } from './punch.service';
import { PairingService } from './pairing.service';
import { AccountMergeService } from './account-merge.service';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import { CalculateModule } from '../calculate/calculate.module';

@Module({
  imports: [CalculateModule],
  controllers: [PunchController],
  providers: [PunchService, PairingService, AccountMergeService, PrismaService, DataScopeService],
  exports: [PunchService, PairingService, AccountMergeService],
})
export class PunchModule {}
