import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recheckMarch11Data() {
  const targetDate = '2026-03-11';

  console.log('========================================');
  console.log('重新查询3月11日数据');
  console.log('========================================\n');

  // 1. 查看所有产线
  console.log('1. 系统中的所有产线:');
  console.log('----------------------------------------');
  const allLines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log(`找到 ${allLines.length} 条产线:\n`);
  for (const line of allLines) {
    console.log(`- ${line.name} (${line.code})`);
    console.log(`  ID: ${line.id}, 工厂ID: ${line.orgId}, 车间ID: ${line.workshopId}`);
    console.log(`  工厂名称: ${line.orgName}`);
    console.log(`  车间名称: ${line.workshopName || '未设置'}`);
  }
  console.log();

  // 2. 查询3月11日的开线记录
  console.log('2. 3月11日的开线记录:');
  console.log('----------------------------------------');
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date(targetDate),
      deletedAt: null,
    },
    include: {
      line: true,
    },
    orderBy: [
      { shiftId: 'asc' },
      { lineId: 'asc' },
    ],
  });

  console.log(`找到 ${lineShifts.length} 条开线记录\n`);

  if (lineShifts.length === 0) {
    console.log('没有开线记录\n');
  } else {
    // 按班次分组
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
        console.log(`    产线ID: ${line.id}`);
        console.log(`    工厂: ${line.orgName} (ID: ${line.orgId})`);
        console.log(`    车间: ${line.workshopName || '未设置'} (ID: ${line.workshopId})`);
        console.log(`    参与分摊: ${ls.participateInAllocation ? '是' : '否'}`);
      }
      console.log();
    }
  }

  // 3. 查询3月11日的产量数据
  console.log('3. 3月11日的产量数据:');
  console.log('----------------------------------------');
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: new Date(targetDate),
      deletedAt: null,
    },
    include: {
      line: true,
    },
    orderBy: [
      { lineId: 'asc' },
      { shiftId: 'asc' },
    ],
  });

  console.log(`找到 ${productionRecords.length} 条产量记录\n`);

  if (productionRecords.length === 0) {
    console.log('没有产量记录\n');
  } else {
    // 过滤掉没有产线信息的记录
    const validRecords = productionRecords.filter(pr => pr.line !== null);

    // 按产线和班次汇总
    const productionMap = new Map<string, number>();

    for (const pr of validRecords) {
      const key = `${pr.line.code}-${pr.shiftId}`;
      if (!productionMap.has(key)) {
        productionMap.set(key, 0);
      }
      productionMap.set(key, productionMap.get(key)! + (pr.actualQty || 0));
    }

    console.log('按产线-班次汇总:\n');
    for (const [key, qty] of productionMap.entries()) {
      console.log(`  ${key}: ${qty} 件`);
    }
    console.log();

    // 按产线汇总
    const lineProductionMap = new Map<string, number>();
    for (const pr of validRecords) {
      const key = pr.line.code;
      if (!lineProductionMap.has(key)) {
        lineProductionMap.set(key, 0);
      }
      lineProductionMap.set(key, lineProductionMap.get(key)! + (pr.actualQty || 0));
    }

    console.log('按产线汇总:\n');
    for (const [lineCode, qty] of lineProductionMap.entries()) {
      console.log(`  ${lineCode}: ${qty} 件`);
    }
    console.log();
  }

  // 4. 按工厂汇总产量
  console.log('4. 按工厂汇总产量:');
  console.log('----------------------------------------');

  if (productionRecords.length > 0) {
    const validRecords = productionRecords.filter(pr => pr.line !== null);
    const factoryProductionMap = new Map<number, { name: string; production: number }>();

    for (const pr of validRecords) {
      const factoryId = pr.line.orgId;
      const factoryName = pr.line.orgName;

      if (!factoryProductionMap.has(factoryId)) {
        factoryProductionMap.set(factoryId, { name: factoryName, production: 0 });
      }
      factoryProductionMap.get(factoryId)!.production += (pr.actualQty || 0);
    }

    console.log('工厂汇总:\n');
    let totalProduction = 0;
    for (const [factoryId, data] of factoryProductionMap.entries()) {
      console.log(`  ${data.name} (ID: ${factoryId}): ${data.production} 件`);
      totalProduction += data.production;
    }
    console.log(`\n  工厂总计: ${totalProduction} 件\n`);

    // 计算分摊比例
    console.log('各工厂占比:\n');
    for (const [factoryId, data] of factoryProductionMap.entries()) {
      const ratio = (data.production / totalProduction * 100).toFixed(2);
      console.log(`  ${data.name}: ${ratio}%`);
    }
    console.log();
  }

  // 5. 检查是否有L3相关数据
  console.log('5. 检查L3线体:');
  console.log('----------------------------------------');

  const l3Line = allLines.find(l => l.code.includes('L3') || l.name.includes('L3'));

  if (l3Line) {
    console.log(`找到L3线体:`);
    console.log(`  名称: ${l3Line.name}`);
    console.log(`  代码: ${l3Line.code}`);
    console.log(`  ID: ${l3Line.id}`);
    console.log(`  工厂: ${l3Line.orgName} (ID: ${l3Line.orgId})`);
    console.log(`  车间: ${l3Line.workshopName || '未设置'} (ID: ${l3Line.workshopId})`);

    // 检查L3在3月11日的开线情况
    const l3LineShifts = lineShifts.filter(ls => ls.lineId === l3Line.id);
    console.log(`  3月11日开线数: ${l3LineShifts.length} 个班次`);

    // 检查L3在3月11日的产量
    const l3Production = productionRecords
      .filter(pr => pr.lineId === l3Line.id && pr.line !== null)
      .reduce((sum, pr) => sum + (pr.actualQty || 0), 0);
    console.log(`  3月11日产量: ${l3Production} 件`);
  } else {
    console.log('未找到L3线体');

    // 查找名称包含W2的产线
    const w2Lines = allLines.filter(l =>
      l.orgName.includes('W2') ||
      l.workshopName?.includes('W2') ||
      l.name.includes('W2')
    );

    if (w2Lines.length > 0) {
      console.log('\n找到W2相关产线:');
      for (const line of w2Lines) {
        console.log(`  - ${line.name} (${line.code})`);
        console.log(`    工厂: ${line.orgName}`);
        console.log(`    车间: ${line.workshopName}`);
      }
    }
  }

  console.log('\n========================================');
}

recheckMarch11Data()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
