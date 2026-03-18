import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCalcResult() {
  try {
    console.log('=== 检查工时记录数据 ===\n');

    // 检查A02员工的I04工时记录
    console.log('1. 检查员工A02的I04工时记录 (2026-03-11):');
    const calcResults = await prisma.calcResult.findMany({
      where: {
        employeeNo: 'A02',
        calcDate: new Date('2026-03-11'),
        attendanceCode: { code: 'I04' },
      },
      include: {
        employee: true,
        attendanceCode: true,
      },
    });

    console.log(`   找到 ${calcResults.length} 条工时记录:`);
    calcResults.forEach((r: any) => {
      console.log(`   - 班次ID: ${r.shiftId}, 班次名称: ${r.shiftName}, 实际工时: ${r.actualHours}, 科目: ${r.accountName}`);
    });
    console.log();

    // 检查排班数据
    console.log('2. 检查员工A02的排班数据 (2026-03-11):');
    const schedules = await prisma.schedule.findMany({
      where: {
        employeeId: 4,  // A02的员工ID
        scheduleDate: new Date('2026-03-11'),
      },
      include: {
        shift: true,
        employee: true,
      },
    });

    console.log(`   找到 ${schedules.length} 条排班记录:`);
    schedules.forEach((s: any) => {
      console.log(`   - 班次ID: ${s.shiftId}, 班次名称: ${s.shift?.name}, 员工: ${s.employee?.name} (${s.employee?.employeeNo})`);
    });

  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCalcResult();
