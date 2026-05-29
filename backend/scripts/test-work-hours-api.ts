import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('测试工时结果查询...\n');

  // 查询2026年5月的工时结果
  const startDate = new Date('2026-05-01');
  const endDate = new Date('2026-05-31');
  endDate.setHours(23, 59, 59, 999);

  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      workDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      definitionAttendanceCode: {
        select: {
          id: true,
          code: true,
          name: true,
          color: true,
          showInDetailPage: true,
        },
      },
    },
    orderBy: { workDate: 'desc' },
    take: 10,
  });

  console.log(`找到 ${workHourResults.length} 条工时记录\n`);

  // 查找挣得工时记录
  const earnedHoursRecords = workHourResults.filter(
    (r) => r.definitionAttendanceCode?.code === 'A07'
  );

  console.log(`其中挣得工时记录数: ${earnedHoursRecords.length}\n`);

  if (earnedHoursRecords.length > 0) {
    console.log('挣得工时记录详情:');
    earnedHoursRecords.forEach((record) => {
      console.log(`员工: ${record.employeeNo}`);
      console.log(`日期: ${record.workDate.toISOString().substring(0, 10)}`);
      console.log(`工时: ${record.workHours}`);
      console.log(`出勤代码: ${record.attendanceCode}`);
      console.log(`定义出勤代码:`);
      console.log(`  代码: ${record.definitionAttendanceCode?.code}`);
      console.log(`  名称: ${record.definitionAttendanceCode?.name}`);
      console.log(`  颜色: ${record.definitionAttendanceCode?.color}`);
      console.log(`  在工时明细页显示: ${record.definitionAttendanceCode?.showInDetailPage}`);
      console.log('---');
    });
  } else {
    console.log('未找到挣得工时记录');
  }

  // 检查是否应该显示
  console.log('\n显示逻辑检查:');
  workHourResults.forEach((record) => {
    const showInDetailPage = record.definitionAttendanceCode?.showInDetailPage;
    const codeName = record.definitionAttendanceCode?.name || record.attendanceCode;
    console.log(`${record.employeeNo} - ${codeName}: ${showInDetailPage === true ? '✓ 显示' : '✗ 不显示'}`);
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});
