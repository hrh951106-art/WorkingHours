import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPI() {
  const employeeNo = '202604003';
  const startDate = '2026-05-10';
  const endDate = '2026-05-12';

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  // 查询工时结果
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      calcDate: { gte: start, lte: end },
      definitionAttendanceCode: { showInAttendanceCard: true },
    },
    include: {
      definitionAttendanceCode: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: { calcDate: 'asc' },
  });

  // 汇总
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
        totalAmount: 0,
      });
    }

    const summary = summaryMap.get(key)!;
    summary.totalHours += result.workHours || 0;
    summary.totalAmount += result.amount || 0;
  });

  const results = Array.from(summaryMap.values()).sort((a, b) => {
    if (a.accountName !== b.accountName) {
      return a.accountName.localeCompare(b.accountName, 'zh-CN');
    }
    return a.attendanceCodeName.localeCompare(b.attendanceCodeName, 'zh-CN');
  });

  const formattedResults = results.map(item => ({
    accountName: item.accountName,
    attendanceCodeName: item.attendanceCodeName,
    totalHours: Math.round(item.totalHours * 100) / 100,
    totalAmount: Math.round(item.totalAmount * 100) / 100,
  }));

  console.log('API返回数据结构:');
  console.log(JSON.stringify(formattedResults, null, 2));
}

testAPI()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
