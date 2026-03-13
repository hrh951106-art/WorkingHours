import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simpleAllocation() {
  console.log('========================================');
  console.log('简化分摊测试');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');
  const batchNo = `TEST-${Date.now()}`;
  const calcTime = new Date();

  console.log(`日期: ${calcDate.toISOString().split('T')[0]}`);
  console.log(`批次号: ${batchNo}\n`);

  // 1. 获取待分摊工时（I04）
  const indirectCode = await prisma.attendanceCode.findUnique({
    where: { code: 'I04' },
  });

  if (!indirectCode) {
    console.log('❌ 未找到出勤代码 I04');
    return;
  }

  const toAllocate = await prisma.calcResult.findMany({
    where: {
      calcDate,
      attendanceCodeId: indirectCode.id,
    },
    include: {
      employee: true,
      attendanceCode: true,
    },
  });

  console.log(`待分摊工时: ${toAllocate.length} 条`);
  toAllocate.forEach(r => {
    console.log(`  ${r.employeeNo} ${r.employee?.name || ''}: ${r.actualHours}h`);
  });
  console.log();

  // 2. 获取直接工时（I03）
  const actualCode = await prisma.attendanceCode.findUnique({
    where: { code: 'I03' },
  });

  if (!actualCode) {
    console.log('❌ 未找到出勤代码 I03');
    return;
  }

  const directResults = await prisma.calcResult.findMany({
    where: {
      calcDate,
      attendanceCodeId: actualCode.id,
    },
    include: {
      employee: {
        include: {
          org: true,
        },
      },
    },
  });

  // 3. 获取开线计划
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

  console.log(`开线计划: ${lineShifts.length} 条`);
  lineShifts.forEach(ls => {
    console.log(`  ${ls.line?.name || 'N/A'} (班次ID: ${ls.shiftId})`);
  });
  console.log();

  // 4. 建立组织ID到产线的映射
  const orgToLine: Record<number, any> = {};
  lineShifts.forEach(ls => {
    if (ls.line) {
      orgToLine[ls.line.orgId] = ls.line;
    }
  });

  // 5. 按产线汇总直接工时（通过员工组织ID）
  const directHoursByLine: Record<number, number> = {};
  directResults.forEach(r => {
    const orgId = r.employee.orgId;
    const line = orgToLine[orgId];
    if (line) {
      directHoursByLine[line.id] = (directHoursByLine[line.id] || 0) + r.actualHours;
    }
  });

  console.log('产线直接工时汇总:');
  Object.entries(directHoursByLine).forEach(([lineId, hours]) => {
    const line = Object.values(orgToLine).find((l: any) => l.id === +lineId) as any;
    console.log(`  ${line?.name || `产线${lineId}`}: ${hours}h`);
  });
  console.log();

  const totalDirectHours = Object.values(directHoursByLine).reduce((a, b) => a + b, 0);
  console.log(`总直接工时: ${totalDirectHours}h\n`);

  if (totalDirectHours === 0) {
    console.log('❌ 总直接工时为0，无法分摊');
    return;
  }

  // 6. 执行分摊
  console.log('========================================');
  console.log('开始分摊');
  console.log('========================================\n');

  let resultCount = 0;

  for (const calcResult of toAllocate) {
    console.log(`员工: ${calcResult.employeeNo} ${calcResult.employee?.name || ''} (${calcResult.actualHours}h)`);

    // 获取排班
    const schedule = await prisma.schedule.findFirst({
      where: {
        employeeId: calcResult.employee.id,
        scheduleDate: calcDate,
      },
      include: { shift: true },
    });

    if (!schedule) {
      console.log(`  ❌ 无排班\n`);
      continue;
    }

    // 获取该班次的产线
    const shiftLines = lineShifts.filter(ls => ls.shiftId === schedule.shiftId);
    if (shiftLines.length === 0) {
      console.log(`  ❌ 班次 ${schedule.shift?.name} 无开线\n`);
      continue;
    }

    console.log(`  班次: ${schedule.shift?.name}, 开线数: ${shiftLines.length}`);

    // 对每条产线分摊
    for (const lineShift of shiftLines) {
      const line = lineShift.line;
      if (!line) continue;

      const lineDirectHours = directHoursByLine[line.id] || 0;
      const ratio = lineDirectHours / totalDirectHours;
      const allocatedHours = calcResult.actualHours * ratio;

      console.log(`    产线: ${line.name}`);
      console.log(`      直接工时: ${lineDirectHours}h`);
      console.log(`      分摊比例: ${(ratio * 100).toFixed(1)}%`);
      console.log(`      分摊工时: ${allocatedHours.toFixed(2)}h`);

      if (allocatedHours > 0) {
        await prisma.allocationResult.create({
          data: {
            batchNo,
            recordDate: calcDate,
            calcResultId: calcResult.id,
            configId: 2,
            configVersion: 1,
            ruleId: 2,
            sourceEmployeeNo: calcResult.employeeNo,
            sourceEmployeeName: calcResult.employee?.name || '',
            sourceAccountId: calcResult.accountId || 0,
            sourceAccountName: calcResult.accountName || '',
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode?.code || '',
            sourceHours: calcResult.actualHours,
            targetType: 'LINE',
            targetId: line.id,
            targetName: line.name,
            targetAccountId: 0,
            allocationBasis: 'ACTUAL_HOURS',
            basisValue: lineDirectHours,
            weightValue: totalDirectHours,
            allocationRatio: ratio,
            allocatedHours,
            calcTime,
          },
        });
        resultCount++;
        console.log(`      ✓ 已创建`);
      }
    }
    console.log();
  }

  console.log('========================================');
  console.log(`分摊完成！创建 ${resultCount} 条结果`);
  console.log(`批次号: ${batchNo}`);
  console.log('========================================');
}

simpleAllocation()
  .catch((e) => {
    console.error('失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
