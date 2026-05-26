import { Module } from '@nestjs/common';
import { AmountCalculateService } from './amount-calculate.service';
import { AmountPolicyController } from './amount-policy.controller';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AmountPolicyController],
  providers: [AmountCalculateService],
  exports: [AmountCalculateService],
})
export class AmountModule {}
