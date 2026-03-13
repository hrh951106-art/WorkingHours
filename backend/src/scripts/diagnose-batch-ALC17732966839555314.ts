import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseBatch() {
  const batchNo = 'ALC17732966839555314';
  const targetDate = '2026-03-11';

  console.log('========================================');
  console.log(`诊断批次 ${batchNo}`);
  console.log('========================================\n');

  // 1. 查询这个批次的分摊结果
  console.log('1. 查询分摊结果:');
  console.log('----------------------------------------');
  const results = await prisma.allocationResult.findMany({
    where: {
      batchNo: batchNo,
      deletedAt: null,
    },
    orderBy: [
      { sourceEmployeeNo: 'asc' },
      { allocationRatio: 'desc' },
    ],
  });

  console.log(`找到 ${results.length} 条分摊结果记录\n`);

  // 按人员分组显示
  const resultsByEmployee = results.reduce((acc, r) => {
    const key = `${r.sourceEmployeeNo} - ${r.sourceEmployeeName}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  for (const [employee, empResults] of Object.entries(resultsByEmployee)) {
    console.log(`【${employee}】`);
    console.log(`  来源账户: ${empResults[0].sourceAccountName}`);
    console.log(`  来源工时: ${empResults[0].sourceHours} 小时`);
    console.log(`  分摊依据: ${empResults[0].allocationBasis}`);
    console.log(`  分摊目标数: ${empResults.length}`);
    console.log(`  分摊详情:`);

    for (const r of empResults) {
      console.log(`    - ${r.targetName}`);
      console.log(`      比重值: ${r.basisValue}, 权重: ${r.weightValue}`);
      console.log(`      分摊比例: ${(r.allocationRatio * 100).toFixed(2)}%, 分摊工时: ${r.allocatedHours.toFixed(4)}小时`);
    }
    console.log();
  }

  // 2. 查看使用的配置
  console.log('2. 查看分摊配置:');
  console.log('----------------------------------------');
  if (results.length > 0) {
    const configId = results[0].configId;
    const ruleId = results[0].ruleId;

    const config = await prisma.allocationConfig.findFirst({
      where: { id: configId },
    });

    const rule = await prisma.allocationRuleConfig.findFirst({
      where: { id: ruleId },
    });

    if (config) {
      console.log(`配置代码: ${config.configCode}`);
      console.log(`配置名称: ${config.configName}`);
    }

    if (rule) {
      console.log(`规则名称: ${rule.ruleName}`);
      console.log(`分摊依据: ${rule.allocationBasis}`);
      console.log(`分摊范围ID: ${rule.allocationScopeId || '未设置'}`);
      console.log(`层级配置: ${rule.allocationHierarchyLevels}`);
    }

    // 查看分摊范围配置
    if (rule?.allocationScopeId) {
      const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
        where: { id: rule.allocationScopeId },
      });
      console.log(`分摊范围: ${hierarchyConfig?.name} (${hierarchyConfig?.mappingValue})`);
    }
    console.log();
  }

  // 3. 查看3月11日的开线情况
  console.log('3. 查看3月11日的开线情况:');
  console.log('----------------------------------------');
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date(targetDate),
      deletedAt: null,
    },
    include: {
      line: {
        select: {
          id: true,
          name: true,
          code: true,
          orgId: true,
          orgName: true,
          workshopId: true,
          workshopName: true,
        },
      },
    },
    orderBy: [
      { shiftId: 'asc' },
      { lineId: 'asc' },
    ],
  });

  console.log(`找到 ${lineShifts.length} 条开线记录\n`);

  const shiftsMap = new Map<number, any[]>();
  for (const ls of lineShifts) {
    if (!shiftsMap.has(ls.shiftId)) {
      shiftsMap.set(ls.shiftId, []);
    }
    shiftsMap.get(ls.shiftId)!.push(ls);
  }

  for (const [shiftId, shiftLines] of shiftsMap.entries()) {
    const shiftName = shiftLines[0].shiftName;
    console.log(`【${shiftName}】(ID: ${shiftId})`);

    for (const ls of shiftLines) {
      const line = ls.line;
      console.log(`  - ${line.name} (${line.code})`);
      console.log(`    工厂: ${line.orgName} (ID: ${line.orgId})`);
      console.log(`    车间: ${line.workshopName} (ID: ${line.workshopId})`);
    }
    console.log();
  }

  // 4. 检查L3线体的情况
  console.log('4. 检查L3线体的开线情况:');
  console.log('----------------------------------------');
  const l3Line = await prisma.productionLine.findFirst({
    where: {
      code: 'L3',
    },
  });

  if (l3Line) {
    console.log(`L3线体信息:`);
    console.log(`  ID: ${l3Line.id}`);
    console.log(`  名称: ${l3Line.name}`);
    console.log(`  工厂: ${l3Line.orgName} (ID: ${l3Line.orgId})`);
    console.log(`  车间: ${l3Line.workshopName} (ID: ${l3Line.workshopId})`);

    const l3LineShifts = await prisma.lineShift.findMany({
      where: {
        lineId: l3Line.id,
        scheduleDate: new Date(targetDate),
        deletedAt: null,
      },
    });

    console.log(`  3月11日开线数: ${l3LineShifts.length} 个班次`);
    for (const ls of l3LineShifts) {
      console.log(`    - ${ls.shiftName} (ID: ${ls.shiftId})`);
    }
  } else {
    console.log('未找到L3线体');
  }
  console.log();

  // 5. 分析问题
  console.log('========================================');
  console.log('问题分析');
  console.log('========================================\n');

  // 统计3月11日开线的产线及其工厂归属
  const uniqueLinesMap = new Map<number, any>();
  for (const ls of lineShifts) {
    if (ls.line && !uniqueLinesMap.has(ls.line.id)) {
      uniqueLinesMap.set(ls.line.id, ls.line);
    }
  }
  const uniqueLines = Array.from(uniqueLinesMap.values());

  console.log(`3月11日共有 ${uniqueLines.length} 条产线开线:`);

  const linesByFactory = new Map<number, any[]>();
  for (const line of uniqueLines) {
    if (!linesByFactory.has(line.orgId)) {
      linesByFactory.set(line.orgId, []);
    }
    linesByFactory.get(line.orgId)!.push(line);
  }

  for (const [orgId, lines] of linesByFactory.entries()) {
    const factoryName = lines[0].orgName;
    console.log(`\n【${factoryName}】(ID: ${orgId}) - ${lines.length}条产线:`);
    for (const line of lines) {
      const isL3 = line.code === 'L3';
      const marker = isL3 ? ' ⚠️ L3线体' : '';
      console.log(`  - ${line.name} (${line.code})${marker}`);
    }
  }

  // 检查L3是否在开线列表中
  const l3InOpenLines = uniqueLines.find(l => l.code === 'L3');
  if (l3InOpenLines) {
    console.log('\n✅ L3线体在3月11日已开线');
    console.log(`   L3所属工厂: ${l3InOpenLines.orgName} (ID: ${l3InOpenLines.orgId})`);

    // 检查分摊结果中是否包含L3
    const hasL3Result = results.some(r => r.targetName.includes('L3') || r.targetName.includes('L3线体'));
    if (!hasL3Result) {
      console.log('\n❌ 问题确认: L3线体在3月11日已开线，但未包含在分摊结果中！');
      console.log('   可能原因:');
      console.log('   1. 查询shiftLines时没有包含L3的开线记录');
      console.log('   2. 计算工厂汇总时没有正确统计L3的数据');
      console.log('   3. 分摊比例计算时遗漏了L3');
    }
  } else {
    console.log('\n⚠️  L3线体在3月11日没有开线记录');
  }

  console.log('\n========================================');
}

diagnoseBatch()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
