import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWorkHourResultsWithAmount() {
  console.log('========================================');
  console.log('测试工时结果汇总API（包含金额）');
  console.log('========================================\n');

  const employeeNo = '202604003';
  const startDate = '2026-05-10';
  const endDate = '2026-05-12';

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  console.log('查询条件:');
  console.log('  员工号:', employeeNo);
  console.log('  日期范围:', startDate, '-', endDate);
  console.log('');

  // 查询工时结果
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      calcDate: {
        gte: start,
        lte: end,
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

  // 按劳动力账户和出勤代码汇总工时和金额
  const summaryMap = new Map<string, {
    accountId: number;
    accountName: string;
    attendanceCodeId: number;
    attendanceCodeStr: string;
    attendanceCodeName: string;
    totalHours: number;
    totalAmount: number;
  }>();

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
        totalAmount: 0,
      });
    }

    const summary = summaryMap.get(key)!;
    summary.totalHours += result.workHours || 0;
    summary.totalAmount += result.amount || 0;
  });

  // 转换为数组并按账户名称、出勤代码排序
  const results = Array.from(summaryMap.values()).sort((a, b) => {
    if (a.accountName !== b.accountName) {
      return a.accountName.localeCompare(b.accountName, 'zh-CN');
    }
    return a.attendanceCodeName.localeCompare(b.attendanceCodeName, 'zh-CN');
  });

  // 格式化输出
  const formattedResults = results.map(item => ({
    accountName: item.accountName,
    attendanceCodeName: item.attendanceCodeName,
    totalHours: Math.round(item.totalHours * 100) / 100,
    totalAmount: Math.round(item.totalAmount * 100) / 100,
  }));

  console.log('📊 汇总结果（返回给前端的数据）:');
  console.log('');
  console.log('┌────────────────────────────────┬────────────┬───────────┬───────────┐');
  console.log('│ 劳动力账户                      │ 出勤代码    │   工时    │   金额    │');
  console.log('├────────────────────────────────┼────────────┼───────────┼───────────┤');

  let totalHours = 0;
  let totalAmount = 0;

  formattedResults.forEach((item, index) => {
    const accountName = item.accountName.length > 30 ? item.accountName.substring(0, 27) + '...' : item.accountName;
    const attendanceCode = item.attendanceCodeName.padEnd(10);
    const hours = item.totalHours.toFixed(2).padStart(9);
    const amount = `¥${item.totalAmount.toFixed(2)}`.padStart(9);

    console.log(`│ ${accountName.padEnd(30)} │ ${attendanceCode} │ ${hours} │ ${amount} │`);

    totalHours += item.totalHours;
    totalAmount += item.totalAmount;
  });

  console.log('├────────────────────────────────┴────────────┴───────────┴───────────┤');
  console.log(`│ 总计                                          │ ${totalHours.toFixed(2).padStart(9)} │ ¥${totalAmount.toFixed(2).padStart(8)} │`);
  console.log('└────────────────────────────────┴────────────┴───────────┴───────────┘');
  console.log('');

  console.log('✅ 测试完成');
  console.log('返回数据包含字段:', Object.keys(formattedResults[0] || {}));
}

testWorkHourResultsWithAmount()
  .then(() => {
    console.log('\n========================================');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
