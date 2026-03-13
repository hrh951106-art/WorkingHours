import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkYieldExecution() {
  console.log('========================================');
  console.log('检查A02_COPY_1773285414740分摊执行情况');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 查找配置
  const config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A02_COPY_1773285414740',
      deletedAt: null,
    },
    include: {
      rules: {
        where: { deletedAt: null },
        include: {
          targets: true,
        },
      },
    },
  });

  if (!config) {
    console.log('❌ 未找到配置\n');
    return;
  }

  console.log('配置信息:');
  console.log(`  名称: ${config.configName}`);
  console.log(`  编码: ${config.configCode}`);
  console.log(`  状态: ${config.status}`);
  console.log(`  规则数: ${config.rules.length}\n`);

  // 2. 检查规则详情
  config.rules.forEach((rule, idx) => {
    console.log(`规则${idx + 1}:`);
    console.log(`  名称: ${rule.ruleName}`);
    console.log(`  类型: ${rule.ruleType}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);
    console.log(`  状态: ${rule.status}`);

    const allocationAttendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    console.log(`  分配归属层级: ${JSON.stringify(allocationHierarchyLevels)}`);
    console.log(`  目标数: ${rule.targets.length}`);
    console.log();
  });

  // 3. 检查该配置的分摊结果
  const results = await prisma.allocationResult.findMany({
    where: {
      recordDate: calcDate,
      configId: config.id,
    },
    orderBy: {
      calcTime: 'desc',
    },
  });

  console.log('========================================');
  console.log(`该配置的分摊结果: ${results.length} 条\n`);

  if (results.length > 0) {
    results.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.sourceEmployeeNo} ${r.sourceEmployeeName || ''}`);
      console.log(`   批次: ${r.batchNo}`);
      console.log(`   依据: ${r.allocationBasis}`);
      console.log(`   源工时: ${r.sourceHours}h`);
      console.log(`   目标: ${r.targetName}`);
      console.log(`   分摊工时: ${r.allocatedHours}h`);
      console.log(`   计算时间: ${r.calcTime}`);
      console.log();
    });
  } else {
    console.log('❌ 该配置没有产生分摊结果\n');
    console.log('可能的原因:');
    console.log('1. 配置没有被执行');
    console.log('2. 执行时出错');
    console.log('3. 没有符合条件的工时数据');
    console.log('4. 产量数据问题');
  }

  // 4. 检查所有最新分摊结果（不限配置）
  console.log('========================================');
  console.log('检查所有最新分摊结果（不限配置）\n');

  const allResults = await prisma.allocationResult.findMany({
    where: {
      recordDate: calcDate,
    },
    orderBy: {
      calcTime: 'desc',
    },
    take: 10,
  });

  console.log(`3月11日最新的分摊结果（前10条）:\n`);

  // 按配置分组统计
  const byConfig: Record<number, any[]> = {};
  allResults.forEach(r => {
    if (!byConfig[r.configId]) {
      byConfig[r.configId] = [];
    }
    byConfig[r.configId].push(r);
  });

  for (const [configId, configResults] of Object.entries(byConfig)) {
    const cfg = await prisma.allocationConfig.findUnique({
      where: { id: +configId },
    });
    console.log(`配置: ${cfg?.configName} (${cfg?.configCode})`);
    console.log(`  分摊依据: ${configResults[0].allocationBasis}`);
    console.log(`  记录数: ${configResults.length}`);
    console.log(`  最新计算时间: ${configResults[0].calcTime}`);
    console.log();
  }

  console.log('========================================');
}

checkYieldExecution()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
