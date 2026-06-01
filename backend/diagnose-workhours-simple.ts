import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== 深入诊断：为什么2026-05-19没有工时结果 ===\n');

  const targetDate = new Date('2026-05-19');
  targetDate.setHours(0, 0, 0, 0);

  // 1. 检查WorkHourResult表
  console.log('1. 检查WorkHourResult表（按日期查询）:');
  const workResults = await prisma.workHourResult.findMany({
    where: {
      workDate: targetDate,
    },
  });

  console.log(`   找到 ${workResults.length} 条工时结果`);

  if (workResults.length > 0) {
    console.log('\n   工时结果详情:');
    for (const result of workResults.slice(0, 10)) {
      console.log(`   - 员工: ${result.employeeNo}, 工时: ${result.workHours}, 出勤代码: ${result.attendanceCode}, 账户: ${result.accountPath}, 状态: ${result.status}`);
    }
  }

  // 2. 检查最近几天的工时结果
  console.log('\n2. 检查最近几天的工时结果（对比分析）:');
  const recentWorkResults = await prisma.workHourResult.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      workDate: 'desc',
    },
    take: 20,
  });

  console.log(`   最近的工时结果（共${recentWorkResults.length}条）:`);
  const dateGroups = new Map<string, any[]>();
  for (const result of recentWorkResults) {
    const dateKey = result.workDate.toISOString().substring(0, 10);
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(result);
  }

  console.log(`   按日期分组统计:`);
  for (const [date, results] of dateGroups.entries()) {
    console.log(`   - ${date}: ${results.length} 条记录`);
  }

  // 3. 检查是否有打卡记录
  console.log('\n3. 检查打卡记录（PunchPair）:');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      pairDate: targetDate,
    },
    take: 5,
  });

  console.log(`   找到 ${punchPairs.length} 条配对结果`);

  if (punchPairs.length > 0) {
    for (const pair of punchPairs) {
      console.log(`   - 员工: ${pair.employeeNo}, 上班: ${pair.inPunchTime}, 下班: ${pair.outPunchTime}`);
    }
  }

  // 4. 检查出勤计算结果
  console.log('\n4. 检查出勤计算结果（CalcResult）:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: targetDate,
    },
    take: 5,
  });

  console.log(`   找到 ${calcResults.length} 条出勤计算结果`);

  if (calcResults.length > 0) {
    for (const result of calcResults) {
      console.log(`   - 员工: ${result.employeeNo}, 实际工时: ${result.actualHours}, 标准工时: ${result.standardHours}`);
    }
  }

  // 5. 检查考勤工时结果
  console.log('\n5. 检查考勤工时推送记录:');
  // 从WorkHourResult的source字段判断数据来源
  const workResultsWithSource = await prisma.workHourResult.findMany({
    where: {
      workDate: targetDate,
    },
    select: {
      employeeNo: true,
      source: true,
      sourceType: true,
      sourceBatchId: true,
      status: true,
    },
    take: 10,
  });

  if (workResultsWithSource.length > 0) {
    console.log('   数据来源分析:');
    for (const result of workResultsWithSource) {
      console.log(`   - 员工: ${result.employeeNo}, 来源: ${result.source}, 类型: ${result.sourceType}, 批次: ${result.sourceBatchId}, 状态: ${result.status}`);
    }
  } else {
    console.log('   ❌ 没有任何工时记录');
  }

  // 6. 总结诊断结果
  console.log('\n=== 诊断总结 ===');
  console.log('关键发现:');

  if (workResults.length === 0) {
    console.log('❌ 2026-05-19的WorkHourResult表中没有任何记录');
    console.log('');
    console.log('可能的原因:');
    console.log('1. 没有执行工时推送（WorkHour Push）操作');
    console.log('2. 工时推送失败，但没有保存记录');
    console.log('3. 工时推送成功，但状态不是ACTIVE（可能是PENDING或其他状态）');
    console.log('4. 考勤计算没有产出结果（CalcResult表为空）');
    console.log('5. 打卡配对没有完成（PunchPair表为空）');
    console.log('');
    console.log('建议操作:');
    console.log('1. 检查是否需要执行考勤计算（Calculate模块）');
    console.log('2. 检查是否需要执行工时推送（WorkHour Push）');
    console.log('3. 查看系统日志，确认是否有计算或推送失败');
  } else {
    console.log(`✓ 2026-05-19有 ${workResults.length} 条工时记录`);
    const activeCount = workResults.filter(r => r.status === 'ACTIVE').length;
    console.log(`  其中ACTIVE状态的: ${activeCount} 条`);

    if (activeCount === 0) {
      console.log('❌ 所有工时记录的状态都不是ACTIVE');
      console.log('  这可能是挣得工时无法计算的原因！');
      console.log('  建议检查工时记录的状态并更新为ACTIVE');
    }
  }

  // 检查前后几天的工时数据
  console.log('\n7. 对比前后日期的工时数据:');
  const checkDates = [
    new Date('2026-05-18'),
    new Date('2026-05-19'),
    new Date('2026-05-20'),
  ];

  for (const date of checkDates) {
    const count = await prisma.workHourResult.count({
      where: {
        workDate: date,
        status: 'ACTIVE',
      },
    });
    console.log(`   ${date.toISOString().substring(0, 10)}: ${count} 条ACTIVE状态的工时记录`);
  }
}

diagnose()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
