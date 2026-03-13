import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { AllocationService } from '../modules/allocation/allocation.service';

async function testAllAllocationRules() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const allocationService = app.get(AllocationService);

  console.log('=== 综合测试所有分摊规则 ===\n');

  // 获取所有启用的分摊配置
  const configs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      configName: 'asc',
    },
  });

  console.log(`找到 ${configs.length} 个分摊配置\n`);

  const results = [];

  for (const config of configs) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`测试配置: ${config.configName}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // 执行分摊计算
    console.log('\n执行分摊计算...');
    try {
      const startTime = Date.now();
      const result = await allocationService.calculateAllocation({
        configId: config.id,
        startDate: '2026-03-11',
        endDate: '2026-03-11',
      });
      const duration = Date.now() - startTime;

      console.log(`✓ 计算成功 (耗时: ${duration}ms)`);
      console.log(`  结果:`, JSON.stringify(result, null, 2).split('\n').map(line => '    ' + line).join('\n'));

      results.push({
        configName: config.configName,
        success: true,
        result,
        duration,
      });
    } catch (error: any) {
      console.error(`✗ 计算失败: ${error.message}`);
      console.error(`  错误详情:`, error.stack?.split('\n').slice(0, 5).join('\n'));

      results.push({
        configName: config.configName,
        success: false,
        error: error.message,
      });
    }
  }

  // 输出测试总结
  console.log('\n\n');
  console.log('========================================');
  console.log('          测试结果总结');
  console.log('========================================\n');

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`总配置数: ${configs.length}`);
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${failureCount}\n`);

  if (failureCount > 0) {
    console.log('失败的配置:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.configName}: ${r.error}`);
      });
    console.log('');
  }

  console.log('成功的配置:');
  results
    .filter(r => r.success)
    .forEach(r => {
      const result = r.result as any;
      console.log(`  ✓ ${r.configName}`);
      if (result && typeof result === 'object') {
        if (result.totalAllocated !== undefined) {
          console.log(`    分摊总量: ${result.totalAllocated}`);
        }
        if (result.allocationCount !== undefined) {
          console.log(`    分摊记录数: ${result.allocationCount}`);
        }
        if (result.message) {
          console.log(`    消息: ${result.message}`);
        }
      }
    });

  console.log('\n========================================');
  console.log('          测试完成');
  console.log('========================================\n');

  // 查询最终的分摊结果数量
  const finalResultsCount = await prisma.allocationResult.count();
  console.log(`数据库中的分摊结果总数: ${finalResultsCount}`);

  await app.close();
}

testAllAllocationRules().catch(console.error);
