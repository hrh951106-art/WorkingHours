import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAllocation() {
  console.log('========================================');
  console.log('测试分摊计算逻辑');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 检查产线的车间ID
  console.log('1. 检查产线配置');
  console.log('--------------------------------------');
  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  lines.forEach(line => {
    console.log(`产线: ${line.name} (ID: ${line.id})`);
    console.log(`  组织ID: ${line.orgId}`);
    console.log(`  车间ID: ${line.workshopId || 'NULL ❌'}`);
    console.log(`  车间名称: ${line.workshopName || '未设置'}`);
    if (!line.workshopId) {
      console.log(`  ⚠️  问题: 该产线未设置车间ID`);
    }
  });
  console.log();

  // 2. 检查开线计划
  console.log('2. 检查开线计划');
  console.log('--------------------------------------');
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: calcDate,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      line: true,
    },
  });

  console.log(`开线记录数: ${lineShifts.length}`);
  lineShifts.forEach(ls => {
    console.log(`  ${ls.line?.name || '未关联产线'} (lineId: ${ls.lineId})`);
    if (ls.line) {
      console.log(`    车间ID: ${ls.line.workshopId || 'NULL'}`);
      console.log(`    参与分摊: ${ls.participateInAllocation ? '是' : '否'}`);
    }
  });
  console.log();

  // 3. 检查直接工时
  console.log('3. 检查直接工时分布');
  console.log('--------------------------------------');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  const actualHoursCode = generalConfig?.actualHoursAllocationCode
    ? await prisma.attendanceCode.findUnique({
        where: { code: generalConfig.actualHoursAllocationCode },
      })
    : null;

  if (actualHoursCode) {
    const directResults = await prisma.calcResult.findMany({
      where: {
        calcDate,
        attendanceCodeId: actualHoursCode.id,
      },
      include: {
        employee: true,
      },
    });

    // 建立班次到产线的映射
    const shiftToLineMap: Record<number, number> = {};
    lineShifts.forEach(ls => {
      if (ls.lineId && ls.line) {
        shiftToLineMap[ls.shiftId] = ls.line.id;
      }
    });

    // 按产线汇总
    const directHoursByLine: Record<number, number> = {};
    directResults.forEach(result => {
      const lineId = shiftToLineMap[result.shiftId];
      if (lineId) {
        if (!directHoursByLine[lineId]) {
          directHoursByLine[lineId] = 0;
        }
        directHoursByLine[lineId] += result.actualHours;
      }
    });

    console.log('按产线汇总直接工时:');
    Object.entries(directHoursByLine).forEach(([lineId, hours]) => {
      const line = lines.find(l => l.id === +lineId);
      console.log(`  产线ID ${lineId} (${line?.name || 'Unknown'}): ${hours} 小时`);
      console.log(`    车间ID: ${line?.workshopId || 'NULL'}`);
    });

    if (Object.keys(directHoursByLine).length === 0) {
      console.log('  ❌ 没有产线有直接工时');
    }
  }
  console.log();

  // 4. 分析问题
  console.log('========================================');
  console.log('问题分析');
  console.log('========================================\n');

  const linesWithoutWorkshop = lines.filter(l => !l.workshopId);
  if (linesWithoutWorkshop.length > 0) {
    console.log('❌ 关键问题: 以下产线未设置车间ID（workshopId）');
    linesWithoutWorkshop.forEach(line => {
      console.log(`  - ${line.name} (ID: ${line.id})`);
    });
    console.log('\n解决方案:');
    console.log('1. 为产线设置车间ID');
    console.log('2. 或者修改分摊逻辑，不依赖车间ID');
  } else {
    console.log('✓ 所有产线都已设置车间ID');
  }
}

testAllocation()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
