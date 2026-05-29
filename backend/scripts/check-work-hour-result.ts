import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const recordDate = '2026-05-07';

  console.log('========================================');
  console.log(`检查员工 ${employeeNo} 在 ${recordDate} 的工时结果`);
  console.log('========================================\n');

  // 1. 查询个人产量记录
  console.log('=== 个人产量记录 ===');
  const personalRecords = await prisma.personalProductionRecord.findMany({
    where: {
      employeeNo,
      recordDate: new Date(recordDate),
      deletedAt: null,
    },
  });

  console.log(`找到 ${personalRecords.length} 条记录\n`);

  let totalEarnedHours = 0;
  personalRecords.forEach((record) => {
    console.log(`产品: ${record.productName}, 产量: ${record.actualQty}, 挣得工时: ${record.earnedHours}`);
    totalEarnedHours += record.earnedHours || 0;
  });

  console.log(`\n个人产量总挣得工时: ${totalEarnedHours} 小时\n`);

  // 2. 查询工时结果表
  console.log('=== 工时结果表 (WorkHourResult) ===');
  const workDate = new Date(recordDate);
  workDate.setHours(0, 0, 0, 0);

  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      workDate,
    },
  });

  console.log(`找到 ${workHourResults.length} 条记录\n`);

  workHourResults.forEach((result) => {
    console.log(`出勤代码: ${result.attendanceCode}, 工时: ${result.workHours}, 来源: ${result.source}, 账户: ${result.accountName}`);
  });

  // 3. 查找挣得工时出勤代码配置
  console.log('\n=== 挣得工时出勤代码配置 ===');
  const earnedHoursConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'earnedHoursAttendanceCode' },
  });

  const earnedHoursAttendanceCode = earnedHoursConfig?.configValue || 'EARNED_HOURS';
  console.log(`配置的出勤代码: ${earnedHoursAttendanceCode}`);

  const attendanceCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: earnedHoursAttendanceCode },
  });

  if (attendanceCode) {
    console.log(`找到出勤代码: ${attendanceCode.code} - ${attendanceCode.name} (id: ${attendanceCode.id})`);

    // 查找该出勤代码的工时结果
    const earnedHoursResults = await prisma.workHourResult.findMany({
      where: {
        employeeNo,
        workDate,
        definitionAttendanceCodeId: attendanceCode.id,
      },
    });

    console.log(`\n挣得工时记录数量: ${earnedHoursResults.length}`);
    earnedHoursResults.forEach((result) => {
      console.log(`  工时: ${result.workHours}, 账户: ${result.accountName}, 来源: ${result.sourceType}`);
    });
  } else {
    console.log('未找到出勤代码配置');
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  });
