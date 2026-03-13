import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseG02Yields() {
  console.log('========================================');
  console.log('G02规则实际产量数据诊断');
  console.log('========================================\n');

  // 1. 查询G02的分摊源配置
  console.log('第一步：查询分摊源配置\n');

  const sourceConfig = await prisma.allocationSourceConfig.findUnique({
    where: {
      configId: 15, // G02配置ID
    },
  });

  if (!sourceConfig) {
    console.log('✗ 未找到分摊源配置');
  } else {
    console.log(`源类型: ${sourceConfig.sourceType}`);
    console.log(`配置详情: ${JSON.stringify(sourceConfig, null, 2)}`);
  }

  // 2. 检查产量数据
  console.log('\n第二步：检查产量数据\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      line: true,
    },
  });

  console.log(`该日期范围内的产量记录数: ${productionRecords.length}\n`);

  if (productionRecords.length === 0) {
    console.log('✗ 该日期范围内没有产量记录');
    console.log('   G02规则使用"实际产量"作为分摊依据，必须有产量数据才能执行分摊');
  } else {
    // 按产线统计
    const lineStats: Record<string, { count: number; totalYield: number }> = {};
    for (const record of productionRecords) {
      const lineName = record.line?.name || 'Unknown';
      if (!lineStats[lineName]) {
        lineStats[lineName] = { count: 0, totalYield: 0 };
      }
      lineStats[lineName].count += 1;
      lineStats[lineName].totalYield += record.actualQty || 0;
    }

    console.log('按产线统计:');
    for (const [lineName, stats] of Object.entries(lineStats)) {
      console.log(`  ${lineName}: ${stats.count} 条记录, 总产量: ${stats.totalYield}`);
    }

    // 按日期统计
    const dateStats: Record<string, number> = {};
    for (const record of productionRecords) {
      const date = record.recordDate.toISOString().split('T')[0];
      dateStats[date] = (dateStats[date] || 0) + 1;
    }

    console.log('\n按日期统计:');
    const sortedDates = Object.keys(dateStats).sort();
    for (const date of sortedDates) {
      console.log(`  ${date}: ${dateStats[date]} 条记录`);
    }
  }

  // 3. 检查分摊归属层级配置
  console.log('\n第三步：检查分摊归属层级配置\n');

  const hierarchyLevels = [28, 29, 30];
  console.log(`分摊归属层级ID: ${hierarchyLevels.join(', ')}\n`);

  for (const levelId of hierarchyLevels) {
    const hierarchy = await prisma.accountHierarchyConfig.findUnique({
      where: { id: levelId },
    });

    if (hierarchy) {
      console.log(`层级ID ${levelId}:`);
      console.log(`  名称: ${hierarchy.name}`);
      console.log(`  层级: ${hierarchy.level}`);
      console.log(`  映射类型: ${hierarchy.mappingType}`);
      console.log(`  映射值: ${hierarchy.mappingValue || '无'}`);
      console.log(`  数据源ID: ${hierarchy.dataSourceId || '无'}`);
      console.log();
    } else {
      console.log(`✗ 未找到层级ID ${levelId}\n`);
    }
  }

  // 4. 检查是否有产线符合分摊归属层级
  console.log('第四步：检查哪些产线符合分摊归属层级\n');

  const allLines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log(`系统中所有产线:\n`);

  for (const line of allLines) {
    console.log(`产线: ${line.name} (ID: ${line.id})`);
    console.log(`  组织ID: ${line.orgId}`);
    console.log(`  组织名称: ${line.orgName}`);
    console.log(`  车间ID: ${line.workshopId || 'NULL'}`);
    console.log(`  车间名称: ${line.workshopName || 'NULL'}`);

    // 检查该产线是否在分摊归属层级中
    // 这里需要根据实际的层级配置逻辑来判断
    console.log();
  }

  // 5. 总结问题
  console.log('========================================');
  console.log('问题诊断总结');
  console.log('========================================\n');

  const issues: string[] = [];

  if (productionRecords.length === 0) {
    issues.push('该日期范围内没有产量记录，G02规则无法按实际产量进行分摊');
  }

  if (issues.length > 0) {
    console.log('发现问题:\n');
    for (let i = 0; i < issues.length; i++) {
      console.log(`${i + 1}. ${issues[i]}`);
    }

    console.log('\n解决方案:');
    console.log('1. 先执行生产数据录入，生成产量记录');
    console.log('2. 或者修改G02规则的分摊依据为"实际工时"');
    console.log('3. 或者检查日期范围是否正确');
  } else {
    console.log('✓ 数据检查通过，需要进一步调查其他原因');
  }

  console.log('\n========================================\n');
}

diagnoseG02Yields()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
