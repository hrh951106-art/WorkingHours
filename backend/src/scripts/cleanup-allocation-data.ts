import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAllocationData() {
  console.log('========================================');
  console.log('清理分摊规则和分摊结果数据');
  console.log('========================================\n');

  const keepCodes = ['L01', 'L02', 'L03', 'L04'];

  // 1. 查看要删除的规则
  console.log('1. 查找要删除的分摊配置:');
  console.log('----------------------------------------');
  const configsToDelete = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
      NOT: {
        configCode: {
          in: keepCodes,
        },
      },
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  console.log(`找到 ${configsToDelete.length} 个需要删除的分摊配置:\n`);
  for (const config of configsToDelete) {
    console.log(`- ${config.configCode}: ${config.configName} (${config.rules.length} 条规则)`);
  }
  console.log();

  // 2. 删除分摊配置（软删除）
  if (configsToDelete.length > 0) {
    console.log('2. 执行删除操作:');
    console.log('----------------------------------------\n');

    const configIds = configsToDelete.map(c => c.id);

    // 软删除分摊配置
    const deleteConfigsResult = await prisma.allocationConfig.updateMany({
      where: {
        id: {
          in: configIds,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log(`✓ 已软删除 ${deleteConfigsResult.count} 个分摊配置`);

    // 软删除相关规则
    const deleteRulesResult = await prisma.allocationRuleConfig.updateMany({
      where: {
        configId: {
          in: configIds,
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log(`✓ 已软删除 ${deleteRulesResult.count} 条分摊规则`);
    console.log();
  } else {
    console.log('2. 没有需要删除的分摊配置\n');
  }

  // 3. 删除所有分摊结果数据
  console.log('3. 删除分摊结果数据:');
  console.log('----------------------------------------');

  const allocationResultsCount = await prisma.allocationResult.count({
    where: {
      deletedAt: null,
    },
  });

  console.log(`找到 ${allocationResultsCount} 条分摊结果记录`);

  if (allocationResultsCount > 0) {
    // 软删除所有分摊结果
    const deleteResultsResult = await prisma.allocationResult.updateMany({
      where: {
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log(`✓ 已软删除 ${deleteResultsResult.count} 条分摊结果记录`);
    console.log();
  } else {
    console.log('没有分摊结果记录需要删除\n');
  }

  // 4. 验证删除结果
  console.log('========================================');
  console.log('验证删除结果');
  console.log('========================================\n');

  const remainingConfigs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      configCode: 'asc',
    },
  });

  console.log(`剩余的分摊配置 (${remainingConfigs.length} 个):`);
  for (const config of remainingConfigs) {
    const ruleCount = await prisma.allocationRuleConfig.count({
      where: {
        configId: config.id,
        deletedAt: null,
      },
    });
    console.log(`  ✓ ${config.configCode}: ${config.configName} (${ruleCount} 条规则)`);
  }
  console.log();

  const remainingResults = await prisma.allocationResult.count({
    where: {
      deletedAt: null,
    },
  });

  console.log(`剩余的分摊结果记录: ${remainingResults} 条`);

  console.log('\n========================================');
  console.log('清理完成');
  console.log('========================================');
  console.log(`保留的规则代码: ${keepCodes.join(', ')}`);
  console.log(`删除的配置数: ${configsToDelete.length}`);
  console.log(`删除的结果记录数: ${allocationResultsCount}`);
  console.log('========================================');
}

cleanupAllocationData()
  .catch((e) => {
    console.error('清理失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
