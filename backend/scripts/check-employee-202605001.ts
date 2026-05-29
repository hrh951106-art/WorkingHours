import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605001';
  const recordDate = '2026-05-06';

  console.log('========================================');
  console.log(`检查员工 ${employeeNo} 在 ${recordDate} 的挣得工时同步情况`);
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

  if (personalRecords.length === 0) {
    console.log('该员工在该日期没有个人产量记录');
  } else {
    let totalEarnedHours = 0;
    personalRecords.forEach((record) => {
      console.log(`ID: ${record.id}`);
      console.log(`产品: ${record.productName}, 产量: ${record.actualQty}, 挣得工时: ${record.earnedHours}`);
      console.log(`组织: ${record.orgName}`);
      console.log(`创建时间: ${record.createdAt.toISOString().substring(0, 19).replace('T', ' ')}`);
      console.log('');
      totalEarnedHours += record.earnedHours || 0;
    });

    console.log(`个人产量总挣得工时: ${totalEarnedHours} 小时\n`);
  }

  // 2. 查询工时结果表中的挣得工时
  console.log('=== WorkHourResult 表中的挣得工时 ===');
  const workDate = new Date(recordDate);
  workDate.setHours(0, 0, 0, 0);

  // 获取挣得工时出勤代码配置
  const earnedHoursConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'earnedHoursAttendanceCode' },
  });

  const earnedHoursAttendanceCode = earnedHoursConfig?.configValue || 'EARNED_HOURS';
  console.log(`配置的挣得工时出勤代码: ${earnedHoursAttendanceCode}`);

  const attendanceCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: earnedHoursAttendanceCode },
  });

  if (attendanceCode) {
    console.log(`出勤代码ID: ${attendanceCode.id}\n`);

    const earnedHoursResults = await prisma.workHourResult.findMany({
      where: {
        employeeNo,
        workDate,
        definitionAttendanceCodeId: attendanceCode.id,
        sourceType: 'PERSONAL_PRODUCTION',
      },
    });

    console.log(`找到 ${earnedHoursResults.length} 条挣得工时记录\n`);

    if (earnedHoursResults.length === 0) {
      console.log('❌ WorkHourResult 表中没有该员工在该日期的挣得工时记录（来源：个人产量）');
    } else {
      let totalWorkHours = 0;
      earnedHoursResults.forEach((result) => {
        console.log(`ID: ${result.id}`);
        console.log(`出勤代码: ${result.attendanceCode}`);
        console.log(`工时: ${result.workHours} 小时`);
        console.log(`账户: ${result.accountName}`);
        console.log(`来源: ${result.sourceType} - ${result.source}`);
        console.log(`创建时间: ${result.createdAt?.toISOString().substring(0, 19).replace('T', ' ')}`);
        console.log('');
        totalWorkHours += result.workHours || 0;
      });

      console.log(`WorkHourResult 总挣得工时: ${totalWorkHours} 小时`);
    }

    // 对比结果
    console.log('\n=== 同步结果对比 ===');
    const personalTotal = personalRecords.reduce((sum, r) => sum + (r.earnedHours || 0), 0);
    const workHourTotal = earnedHoursResults.reduce((sum, r) => sum + (r.workHours || 0), 0);

    console.log(`个人产量记录总挣得工时: ${personalTotal} 小时`);
    console.log(`WorkHourResult 总挣得工时: ${workHourTotal} 小时`);

    if (personalTotal === workHourTotal && earnedHoursResults.length > 0) {
      console.log('\n✅ 数据已正确同步到 WorkHourResult 表');
    } else if (earnedHoursResults.length === 0) {
      console.log('\n❌ 数据未同步到 WorkHourResult 表');
    } else {
      console.log('\n⚠️ 数据不一致');
    }
  } else {
    console.log('未找到挣得工时出勤代码配置');
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  });
