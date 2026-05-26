import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFullFlow() {
  console.log('========================================');
  console.log('测试完整的考勤卡流程');
  console.log('========================================\n');

  const employeeNo = '202604003';
  const startDate = '2026-05-10';
  const endDate = '2026-05-12';

  // 1. 测试 getWorkHourResults API
  console.log('【1️⃣ 测试工时结果汇总API】');
  console.log('查询条件:', { employeeNo, startDate, endDate });
  console.log('');

  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      calcDate: {
        gte: new Date(startDate + 'T00:00:00'),
        lte: new Date(endDate + 'T23:59:59'),
      },
      definitionAttendanceCode: {
        showInAttendanceCard: true,
      },
    },
    include: {
      definitionAttendanceCode: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: { calcDate: 'asc' },
  });

  console.log(`找到 ${workHourResults.length} 条原始工时结果\n`);

  // 模拟后端汇总逻辑
  const summaryMap = new Map<string, any>();
  workHourResults.forEach((result) => {
    const accountName = result.accountName || '未分配';
    const attendanceCodeStr = result.definitionAttendanceCode?.name || result.definitionAttendanceCodeStr || '未分类';
    const key = `${accountName}|${attendanceCodeStr}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        accountId: result.accountId || 0,
        accountName,
        attendanceCodeId: result.definitionAttendanceCodeId || 0,
        attendanceCodeStr,
        attendanceCodeName: result.definitionAttendanceCode?.name || result.definitionAttendanceCodeStr || '未分类',
        totalHours: 0,
      });
    }

    const summary = summaryMap.get(key)!;
    summary.totalHours += result.workHours || 0;
  });

  const results = Array.from(summaryMap.values());

  console.log('📊 汇总结果（返回给前端的数据）:');
  results.forEach((item, index) => {
    console.log(`  ${index + 1}. 账户: ${item.accountName}`);
    console.log(`     出勤代码: ${item.attendanceCodeName} (${item.attendanceCodeStr})`);
    console.log(`     总工时: ${item.totalHours} 小时`);
    console.log('');
  });

  // 2. 测试 getWorkHourDetails API（使用第一个结果）
  if (results.length > 0) {
    const firstResult = results[0];

    console.log('【2️⃣ 测试工时明细API】');
    console.log('使用第一个汇总结果查询明细:');
    console.log('  账户:', firstResult.accountName);
    console.log('  出勤代码:', firstResult.attendanceCodeName);
    console.log('');

    const workHourDetails = await prisma.workHourResult.findMany({
      where: {
        employeeNo,
        calcDate: {
          gte: new Date(startDate + 'T00:00:00'),
          lte: new Date(endDate + 'T23:59:59'),
        },
        accountName: firstResult.accountName,
        definitionAttendanceCode: {
          name: firstResult.attendanceCodeName,
          showInAttendanceCard: true,
        },
      },
      include: {
        definitionAttendanceCode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { calcDate: 'asc' },
    });

    console.log(`找到 ${workHourDetails.length} 条工时明细\n`);

    if (workHourDetails.length > 0) {
      console.log('📋 明细数据（返回给前端的数据）:');
      workHourDetails.forEach((detail, index) => {
        console.log(`  ${index + 1}. 日期: ${detail.calcDate.toISOString().split('T')[0]}`);
        console.log('     账户:', detail.accountName);
        console.log('     出勤代码:', detail.definitionAttendanceCode?.name);
        console.log('     工时:', detail.workHours, '小时');
        console.log('     金额:', detail.amount || 0, '元 ✅');
        console.log('     班次:', detail.shiftName || '-');
        console.log('');
      });
    } else {
      console.log('❌ 没有找到明细数据');
      console.log('');
      console.log('可能的原因:');
      console.log('  1. accountName 不完全匹配');
      console.log('  2. attendanceCodeName 不完全匹配');
      console.log('  3. showInAttendanceCard = false');
    }
  }

  console.log('========================================');
}

testFullFlow()
  .then(() => {
    console.log('测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
