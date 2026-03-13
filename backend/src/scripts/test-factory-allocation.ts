import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { AllocationService } from '../modules/allocation/allocation.service';

async function testFactoryAllocation() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const allocationService = app.get(AllocationService);

  console.log('=== 测试G02工厂级别分摊规则 ===\n');

  // 获取工厂实际产量配置
  const config = await prisma.allocationConfig.findFirst({
    where: {
      configName: '工厂实际产量',
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
    console.log('未找到"工厂实际产量"配置');
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

testFactoryAllocation().catch(console.error);
