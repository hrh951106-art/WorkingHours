import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { AllocationService } from '../modules/allocation/allocation.service';

async function testWorkshopAllocation() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const allocationService = app.get(AllocationService);

  console.log('=== 测试L02车间级别分摊规则 ===\n');

  // 获取车间标准工时分摊配置
  const config = await prisma.allocationConfig.findFirst({
    where: {
      configName: '车间标准工时分摊规则',
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
      sourceConfig: true,
    },
  });

  if (!config) {
    console.log('未找到"车间标准工时分摊规则"配置');
    await app.close();
    return;
  }

  console.log(`配置名称: ${config.configName}`);
  console.log(`分摊源出勤代码: ${config.sourceConfig?.attendanceCodes}`);

  // 执行分摊计算
  console.log('\n执行分摊计算...');
  try {
    const result = await allocationService.calculateAllocation({
      configId: config.id,
      startDate: '2026-03-11',
      endDate: '2026-03-11',
    });
    console.log(`分摊计算结果:`, result);
  } catch (error: any) {
    console.error(`分摊计算失败: ${error.message}`);
  }

  console.log('\n=== 测试完成 ===');

  await app.close();
}

testWorkshopAllocation().catch(console.error);
