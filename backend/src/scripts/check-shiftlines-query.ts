import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkShiftLinesQuery() {
  const targetDate = '2026-03-11';

  console.log('========================================');
  console.log('检查shiftLines查询逻辑');
  console.log('========================================\n');

  // 1. 查看L3产线的详细信息
  console.log('1. L3产线信息:');
  console.log('----------------------------------------');
  const l3Line = await prisma.productionLine.findFirst({
    where: {
      code: 'LINE_L3',
    },
  });

  if (l3Line) {
    console.log(`L3产线: ${l3Line.name} (ID: ${l3Line.id})`);
    console.log(`  工厂: ${l3Line.orgName} (ID: ${l3Line.orgId})`);
    console.log(`  车间: ${l3Line.workshopName} (ID: ${l3Line.workshopId})`);
    console.log(`  状态: ${l3Line.status}`);
  } else {
    console.log('L3产线不存在');
    await prisma.$disconnect();
    return;
  }
  console.log();

  // 2. 查询3月11日的所有LineShift记录
  console.log('2. 3月11日的所有LineShift记录:');
  console.log('----------------------------------------');
  const allLineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date(targetDate),
    },
    include: {
      line: true,
    },
    orderBy: {
      lineId: 'asc',
    },
  });

  console.log(`找到 ${allLineShifts.length} 条LineShift记录:\n`);

  for (const ls of allLineShifts) {
    console.log(`LineShift ID: ${ls.id}`);
    console.log(`  产线: ${ls.line ? ls.line.name : '未关联'} (${ls.line ? ls.line.code : 'N/A'})`);
    console.log(`  产线ID: ${ls.lineId}`);
    console.log(`  班次: ${ls.shiftName} (ID: ${ls.shiftId})`);
    console.log(`  参与分摊: ${ls.participateInAllocation ? '是' : '否'}`);
    console.log(`  状态: ${ls.status}`);
    console.log();
  }

  // 3. 模拟分摊逻辑中的查询
  console.log('3. 模拟分摊逻辑查询 (participateInAllocation=true):');
  console.log('----------------------------------------');

  const activeLineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date(targetDate),
      participateInAllocation: true,
    },
    include: {
      line: true,
    },
    orderBy: {
      lineId: 'asc',
    },
  });

  console.log(`找到 ${activeLineShifts.length} 条参与分摊的LineShift记录:\n`);

  for (const ls of activeLineShifts) {
    console.log(`- ${ls.line.name} (${ls.line.code})`);
    console.log(`  工厂: ${ls.line.orgName} (ID: ${ls.line.orgId})`);
    console.log(`  产量: 待查询`);
  }
  console.log();

  // 4. 检查L3的LineShift记录
  console.log('4. 检查L3的LineShift记录:');
  console.log('----------------------------------------');

  const l3LineShifts = allLineShifts.filter(ls => ls.lineId === l3Line.id);

  if (l3LineShifts.length === 0) {
    console.log('❌ L3没有LineShift记录！');
    console.log('\n这就是问题所在：L3产线在3月11日没有开线记录，');
    console.log('所以分摊逻辑无法查询到L3的数据。');
  } else {
    console.log(`找到 ${l3LineShifts.length} 条L3的LineShift记录:\n`);

    for (const ls of l3LineShifts) {
      console.log(`LineShift ID: ${ls.id}`);
      console.log(`  产线: ${ls.line.name}`);
      console.log(`  班次: ${ls.shiftName}`);
      console.log(`  参与分摊: ${ls.participateInAllocation ? '是' : '否'}`);

      if (!ls.participateInAllocation) {
        console.log(`  ⚠️  警告：该开线记录的participateInAllocation=false，不会参与分摊！`);
      }
    }
  }
  console.log();

  // 5. 查询产量数据
  console.log('5. 查询产量数据:');
  console.log('----------------------------------------');

  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: new Date(targetDate),
    },
    include: {
      line: true,
    },
  });

  console.log(`找到 ${productionRecords.length} 条产量记录:\n`);

  const productionByLine = new Map<number, number>();
  for (const pr of productionRecords) {
    if (pr.line) {
      if (!productionByLine.has(pr.line.id)) {
        productionByLine.set(pr.line.id, 0);
      }
      productionByLine.set(pr.line.id, productionByLine.get(pr.line.id)! + (pr.actualQty || 0));
    }
  }

  for (const [lineId, qty] of productionByLine.entries()) {
    const line = await prisma.productionLine.findUnique({
      where: { id: lineId },
    });
    console.log(`- ${line?.name} (${line?.code}): ${qty} 件`);
  }
  console.log();

  // 6. 问题分析
  console.log('========================================');
  console.log('问题分析');
  console.log('========================================\n');

  const l3InActiveShifts = activeLineShifts.some(ls => ls.lineId === l3Line.id);
  const l3HasProduction = productionByLine.has(l3Line.id);

  console.log(`L3产线在参与分摊的LineShift中: ${l3InActiveShifts ? '是' : '否'}`);
  console.log(`L3产线有产量数据: ${l3HasProduction ? '是' : '否'}`);
  console.log();

  if (!l3InActiveShifts) {
    console.log('❌ 问题确认: L3产线没有在参与分摊的LineShift记录中！');
    console.log('\n可能的原因:');
    console.log('1. L3的LineShift记录的participateInAllocation字段为false');
    console.log('2. L3没有LineShift记录（虽然我们之前创建了）');

    console.log('\n解决方案:');
    console.log('需要将L3的LineShift记录的participateInAllocation设置为true');
  } else if (!l3HasProduction) {
    console.log('❌ 问题确认: L3产线没有产量数据！');
    console.log('\n可能的原因:');
    console.log('1. L3的ProductionRecord记录没有正确关联到L3产线');
  } else {
    console.log('✓ L3产线既有LineShift记录又有产量数据');
    console.log('\n但分摊结果中仍然没有L3，说明问题可能在：');
    console.log('1. 分摊逻辑的查询条件');
    console.log('2. 工厂汇总的计算逻辑');
    console.log('3. 层级配置的过滤条件');
  }

  console.log('\n========================================');
}

checkShiftLinesQuery()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
