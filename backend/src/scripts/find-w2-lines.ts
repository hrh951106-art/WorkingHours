import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findW2Lines() {
  console.log('========================================');
  console.log('查找W2总装车间的产线');
  console.log('========================================\n');

  // 1. 查看所有产线
  console.log('1. 所有产线列表:');
  console.log('----------------------------------------');
  const allLines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [
      { orgId: 'asc' },
      { workshopId: 'asc' },
      { id: 'asc' },
    ],
  });

  console.log(`找到 ${allLines.length} 条产线\n`);

  for (const line of allLines) {
    console.log(`- ${line.name} (${line.code})`);
    console.log(`  ID: ${line.id}`);
    console.log(`  工厂: ${line.orgName} (ID: ${line.orgId})`);
    console.log(`  车间: ${line.workshopName || '未设置'} (ID: ${line.workshopId || '未设置'})`);
    console.log();
  }

  // 2. 查找W2总装车间的产线
  console.log('2. 查找W2总装车间的产线:');
  console.log('----------------------------------------');
  const w2Lines = allLines.filter(l =>
    l.orgName.includes('W2') ||
    l.workshopName?.includes('W2')
  );

  if (w2Lines.length > 0) {
    console.log(`找到 ${w2Lines.length} 条W2相关产线:\n`);
    for (const line of w2Lines) {
      console.log(`- ${line.name} (${line.code})`);
      console.log(`  工厂: ${line.orgName}`);
      console.log(`  车间: ${line.workshopName}`);
      console.log();
    }
  } else {
    console.log('未找到W2总装车间的产线\n');
  }

  // 3. 查找3月11日的开线情况
  console.log('3. 3月11日的开线情况:');
  console.log('----------------------------------------');
  const targetDate = new Date('2026-03-11');

  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: targetDate,
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

  for (const ls of lineShifts) {
    const line = ls.line;
    console.log(`- ${line.name} (${line.code})`);
    console.log(`  班次: ${ls.shiftName} (ID: ${ls.shiftId})`);
    console.log(`  工厂: ${line.orgName} (ID: ${line.orgId})`);
    console.log(`  车间: ${line.workshopName || '未设置'} (ID: ${line.workshopId || '未设置'})`);
    console.log();
  }

  // 4. 按工厂汇总
  console.log('4. 按工厂汇总:');
  console.log('----------------------------------------');

  const linesByFactory = new Map<number, any[]>();
  for (const ls of lineShifts) {
    const line = ls.line;
    if (!linesByFactory.has(line.orgId)) {
      linesByFactory.set(line.orgId, []);
    }
    linesByFactory.get(line.orgId)!.push(ls);
  }

  for (const [orgId, factoryLines] of linesByFactory.entries()) {
    const factoryName = factoryLines[0].line.orgName;
    console.log(`\n【${factoryName}】(ID: ${orgId})`);
    console.log(`  开线数: ${factoryLines.length} 条记录`);

    const uniqueLinesInFactory = Array.from(
      new Map(factoryLines.map(ls => [ls.line.id, ls.line])).values()
    );
    console.log(`  产线数: ${uniqueLinesInFactory.length} 条`);
    for (const line of uniqueLinesInFactory) {
      const shiftsForLine = factoryLines.filter(ls => ls.lineId === line.id);
      console.log(`    - ${line.name} (${line.code}): ${shiftsForLine.length} 个班次`);
    }
  }

  console.log('\n========================================');
}

findW2Lines()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
