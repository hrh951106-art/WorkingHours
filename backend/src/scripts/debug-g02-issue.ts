import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugG02Issue() {
  console.log('========================================');
  console.log('G02分摊规则深度排查');
  console.log('========================================\n');

  // 1. 查询G02配置详情
  console.log('1. G02配置详情:');
  console.log('----------------------------------------');

  const g02Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'G02',
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

  if (!g02Config) {
    console.log('❌ 未找到G02配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`✓ 配置名称: ${g02Config.configName}`);
  console.log(`  配置代码: ${g02Config.configCode}`);
  console.log(`  配置ID: ${g02Config.id}`);
  console.log(`  数据源: ${g02Config.sourceConfig ? g02Config.sourceConfig.sourceType : '未设置'}`);
  console.log(`  状态: ${g02Config.status}`);
  console.log(`  规则数量: ${g02Config.rules.length}`);

  for (const rule of g02Config.rules) {
    console.log(`\n  规则: ${rule.ruleName}`);
    console.log(`    规则ID: ${rule.id}`);
    console.log(`    分摊依据: ${rule.allocationBasis}`);
    console.log(`    分摊范围ID: ${rule.allocationScopeId}`);

    if (rule.allocationScopeId) {
      const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
        where: { id: rule.allocationScopeId },
      });
      if (hierarchyConfig) {
        console.log(`    分摊范围: ${hierarchyConfig.name}`);
        console.log(`    映射类型: ${hierarchyConfig.mappingType}`);
        console.log(`    映射值: ${hierarchyConfig.mappingValue}`);
      }
    }
  }
  console.log();

  // 2. 检查最近的分摊结果
  console.log('2. 检查G02的分摊结果:');
  console.log('----------------------------------------');

  const recentResults = await prisma.allocationResult.findMany({
    where: {
      configId: g02Config.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  console.log(`找到 ${recentResults.length} 条G02的分摊结果`);
  if (recentResults.length > 0) {
    console.log('\n最近的分摊结果:');
    for (const result of recentResults) {
      console.log(`  - 批次号: ${result.batchNo}`);
      console.log(`    创建时间: ${result.createdAt}`);
      console.log(`    记录日期: ${result.recordDate}`);
      console.log(`    分摊依据: ${result.allocationBasis}`);
    }
  } else {
    console.log('⚠️  G02从未生成分摊结果');
  }
  console.log();

  // 3. 检查必要数据 - 使用最新日期
  console.log('3. 检查必要数据:');
  console.log('----------------------------------------');

  // 获取最新的开线记录日期
  const latestLineShift = await prisma.lineShift.findFirst({
    where: {
      deletedAt: null,
    },
    orderBy: {
      scheduleDate: 'desc',
    },
  });

  const targetDate = latestLineShift?.scheduleDate || new Date('2026-03-11');
  console.log(`检查日期: ${targetDate.toISOString().split('T')[0]}\n`);

  // 检查间接工时数据
  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: targetDate,
    },
  });

  const indirectResults = calcResults.filter(cr =>
    cr.accountName?.includes('间接设备') && cr.actualHours > 0
  );

  console.log(`间接工时数据: ${indirectResults.length > 0 ? '✓ 有' : '✗ 无'} (${indirectResults.length} 条)`);

  if (indirectResults.length > 0) {
    console.log('\n间接工时详情（前5条）:');
    for (let i = 0; i < Math.min(5, indirectResults.length); i++) {
      const cr = indirectResults[i];
      console.log(`  - ${cr.accountName}: ${cr.actualHours} 小时`);
      console.log(`    员工: ${cr.employeeNo || '未知'}`);
      console.log(`    科目ID: ${cr.accountId}`);
    }
  }
  console.log();

  // 检查开线记录
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: targetDate,
      deletedAt: null,
      participateInAllocation: true,
    },
    include: {
      line: true,
    },
  });

  console.log(`开线记录: ${lineShifts.length > 0 ? '✓ 有' : '✗ 无'} (${lineShifts.length} 条)`);

  if (lineShifts.length > 0) {
    console.log('\n开线记录详情:');
    for (const ls of lineShifts) {
      const line = await prisma.productionLine.findUnique({
        where: { id: ls.lineId || 0 },
      });
      if (line) {
        console.log(`  - ${line.name} (${line.code})`);
        console.log(`    班次: ${ls.shiftName}`);
        console.log(`    参加分摊: ${ls.participateInAllocation ? '是' : '否'}`);
      }
    }
  }
  console.log();

  // 检查产量数据
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: targetDate,
      deletedAt: null,
    },
  });

  console.log(`产量数据: ${productionRecords.length > 0 ? '✓ 有' : '✗ 无'} (${productionRecords.length} 条)`);

  if (productionRecords.length > 0) {
    // 按产线汇总
    const productionByLine = new Map<number, { lineName: string; lineCode: string; qty: number }>();
    for (const pr of productionRecords) {
      if (pr.lineId) {
        if (!productionByLine.has(pr.lineId)) {
          const line = await prisma.productionLine.findUnique({
            where: { id: pr.lineId },
          });
          if (line) {
            productionByLine.set(pr.lineId, {
              lineName: line.name,
              lineCode: line.code,
              qty: 0,
            });
          }
        }
        const data = productionByLine.get(pr.lineId);
        if (data) {
          data.qty += pr.actualQty || 0;
        }
      }
    }

    let totalQty = 0;
    for (const [, data] of productionByLine.entries()) {
      totalQty += data.qty;
    }

    console.log('\n按产线汇总产量:');
    console.log(`总产量: ${totalQty} 件\n`);

    for (const [, data] of productionByLine.entries()) {
      const ratio = totalQty > 0 ? (data.qty / totalQty * 100).toFixed(2) : '0.00';
      console.log(`  - ${data.lineCode} (${data.lineName}): ${data.qty} 件 (${ratio}%)`);
    }
  }
  console.log();

  // 4. 检查组织结构
  console.log('4. 检查组织结构:');
  console.log('----------------------------------------');

  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log(`产线数量: ${lines.length}\n`);

  for (const line of lines) {
    console.log(`- ${line.code} (${line.name})`);
    console.log(`  orgId: ${line.orgId} (${line.orgName || '未设置'})`);
    console.log(`  workshopId: ${line.workshopId || '未设置'} (${line.workshopName || '未设置'})`);
  }
  console.log();

  // 5. 检查分摊范围配置
  console.log('5. 检查层级配置:');
  console.log('----------------------------------------');

  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      level: 'asc',
    },
  });

  console.log(`找到 ${hierarchyConfigs.length} 个层级配置:\n`);

  for (const config of hierarchyConfigs) {
    console.log(`- ${config.name} (ID: ${config.id})`);
    console.log(`  映射类型: ${config.mappingType}`);
    console.log(`  映射值: ${config.mappingValue}`);
    console.log(`  层级: ${config.level}`);
  }
  console.log();

  // 6. 分析为什么没有生成分摊结果
  console.log('========================================');
  console.log('问题分析');
  console.log('========================================\n');

  const hasIndirectData = indirectResults.length > 0;
  const hasLineShifts = lineShifts.length > 0;
  const hasProduction = productionRecords.length > 0;

  if (!hasIndirectData) {
    console.log('❌ 缺少间接工时数据');
    console.log('   原因: CalcResult表中没有找到包含"间接设备"的记录');
  }
  if (!hasLineShifts) {
    console.log('❌ 缺少开线记录');
    console.log('   原因: LineShift表中没有找到participateInAllocation=true的记录');
  }
  if (!hasProduction) {
    console.log('❌ 缺少产量数据');
    console.log('   原因: ProductionRecord表中没有找到产量记录');
  }

  if (hasIndirectData && hasLineShifts && hasProduction) {
    console.log('✓ 所有必要数据都已就绪');
    console.log('\n可能的原因:');
    console.log('1. 分摊逻辑代码中存在过滤条件过于严格');
    console.log('2. 组织结构映射存在问题');
    console.log('3. 工厂级别的汇总逻辑有问题');
    console.log('4. allocationScopeId的值不匹配');
  }

  console.log('\n========================================');
  console.log('排查完成');
  console.log('========================================');
}

debugG02Issue()
  .catch((e) => {
    console.error('排查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
