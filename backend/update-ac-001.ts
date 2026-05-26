import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 更新 AC_001 配置 ===');

  // 更新 AC_001 的 showInAttendanceCard 为 true
  const updated = await prisma.definitionAttendanceCode.update({
    where: { code: 'AC_001' },
    data: { showInAttendanceCard: true },
  });

  console.log('\n✓ 更新成功:');
  console.log('  Code:', updated.code);
  console.log('  Name:', updated.name);
  console.log('  showInAttendanceCard:', updated.showInAttendanceCard);

  // 验证更新
  console.log('\n=== 验证查询 ===');

  // 获取有 AC_001 数据的员工
  const testEmployee = await prisma.workHourResult.findFirst({
    where: {
      definitionAttendanceCodeId: updated.id,
    },
    select: {
      employeeNo: true,
    },
  });

  if (testEmployee) {
    const results = await prisma.workHourResult.findMany({
      where: {
        employeeNo: testEmployee.employeeNo,
        definitionAttendanceCode: {
          showInAttendanceCard: true,
        },
      },
      include: {
        definitionAttendanceCode: {
          select: {
            code: true,
            name: true,
            showInAttendanceCard: true,
          },
        },
      },
      orderBy: { calcDate: 'desc' },
    });

    console.log(`\n员工 ${testEmployee.employeeNo} 的考勤卡数据:`);
    console.log(`查询到 ${results.length} 条记录`);

    results.forEach((r) => {
      console.log(`  - ${r.calcDate.toISOString().split('T')[0]}: ${r.definitionAttendanceCode?.name} (${r.workHours}小时)`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
