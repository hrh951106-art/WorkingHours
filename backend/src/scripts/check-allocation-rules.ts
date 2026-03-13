import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllocationRules() {
  console.log('========================================');
  console.log('查看现有的分摊规则配置');
  console.log('========================================\n');

  // 1. 查看所有分摊配置
  const configs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`找到 ${configs.length} 个分摊配置:\n`);

  for (const config of configs) {
    console.log(`- 配置代码: ${config.configCode}`);
    console.log(`  配置名称: ${config.configName}`);
    console.log(`  ID: ${config.id}`);
    console.log(`  规则数: ${config.rules.length}`);
    console.log(`  创建时间: ${config.createdAt}`);
    console.log();
  }

  // 2. 检查哪些规则代码需要保留或删除
  console.log('----------------------------------------');
  console.log('规则代码分析:');
  console.log('----------------------------------------\n');

  const keepCodes = ['L01', 'L02', 'L03', 'L04'];

  const toKeep = configs.filter(c => keepCodes.includes(c.configCode));
  const toDelete = configs.filter(c => !keepCodes.includes(c.configCode));

  console.log(`需要保留的规则 (${toKeep.length} 个):`);
  for (const config of toKeep) {
    console.log(`  ✓ ${config.configCode} - ${config.configName}`);
  }
  console.log();

  console.log(`需要删除的规则 (${toDelete.length} 个):`);
  for (const config of toDelete) {
    console.log(`  ✗ ${config.configCode} - ${config.configName}`);
  }
  console.log();

  // 3. 查看分摊结果数据
  console.log('----------------------------------------');
  console.log('分摊结果数据统计:');
  console.log('----------------------------------------\n');

  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log(`找到 ${allocationResults.length} 条分摊结果记录`);

  if (allocationResults.length > 0) {
    const recordDates = [...new Set(allocationResults.map(r => r.recordDate.toISOString().split('T')[0]))];
    console.log(`涉及日期: ${recordDates.join(', ')}`);

    const configIds = [...new Set(allocationResults.map(r => r.configId))];
    console.log(`涉及配置数: ${configIds.length}`);
  }

  console.log('\n========================================');
}

checkAllocationRules()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
