import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScheduleAndLineData() {
  try {
    console.log('=== 检查排班和开线数据 ===\n');

    // 1. 检查2026-03-11的排班数据
    console.log('1. 2026-03-11的排班数据:');
    const schedules = await prisma.schedule.findMany({
      where: {
        scheduleDate: new Date('2026-03-11'),
      },
      include: {
        employee: true,
        shift: true,
      },
    });

    console.log(`   排班记录数: ${schedules.length}`);
    schedules.forEach((s: any) => {
      console.log(`   - ${s.employee.name} (${s.employee.employeeNo}) | 班次: ${s.shift.name} (ID:${s.shift.id}) | 状态: ${s.status}`);
    });
    console.log();

    // 2. 检查2026-03-11的开线数据
    console.log('2. 2026-03-11的开线数据 (LineShift):');
    const lineShifts = await prisma.lineShift.findMany({
      where: {
        scheduleDate: new Date('2026-03-11'),
      },
      include: {
        line: true,
      },
    });

    console.log(`   开线记录数: ${lineShifts.length}`);
    lineShifts.forEach((ls: any) => {
      console.log(`   - 产线: ${ls.line?.name || 'N/A'} (ID:${ls.lineId}) | 班次: ${ls.shiftName} (ID:${ls.shiftId}) | 组织: ${ls.orgName}`);
    });
    console.log();

    // 3. 检查工时记录的班次信息
    console.log('3. 2026-03-11的I04工时记录:');
    const calcResults = await prisma.calcResult.findMany({
      where: {
        calcDate: new Date('2026-03-11'),
        attendanceCode: { code: 'I04' },
      },
      include: {
        employee: true,
        attendanceCode: true,
      },
    });

    console.log(`   工时记录数: ${calcResults.length}`);
    calcResults.forEach((r: any) => {
      console.log(`   - ${r.employee.name} (${r.employeeNo}) | 班次ID: ${r.shiftId} | 班次名称: ${r.shiftName} | 实际工时: ${r.actualHours} | 科目: ${r.accountName}`);
    });
    console.log();

    // 4. 检查不同日期的开线情况
    console.log('4. 检查最近几天的开线情况:');
    const recentDates = ['2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14'];
    for (const dateStr of recentDates) {
      const lineShiftCount = await prisma.lineShift.count({
        where: { scheduleDate: new Date(dateStr) },
      });
      console.log(`   ${dateStr}: ${lineShiftCount} 条开线记录`);
    }

  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkScheduleAndLineData();
