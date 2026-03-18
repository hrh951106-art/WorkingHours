import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchedule() {
  try {
    console.log('=== 检查排班数据 ===\n');

    // 1. 检查员工信息
    console.log('1. 检查员工 A02:');
    const employee = await prisma.employee.findUnique({
      where: { employeeNo: 'A02' },
    });

    if (employee) {
      console.log(`   员工ID: ${employee.id}`);
      console.log(`   员工编号: ${employee.employeeNo}`);
      console.log(`   员工姓名: ${employee.name}`);
    }
    console.log();

    // 2. 检查2026-03-11的排班（不使用shiftId条件）
    console.log('2. 检查2026-03-11的所有排班:');
    const allSchedules = await prisma.schedule.findMany({
      where: {
        scheduleDate: new Date('2026-03-11'),
        employeeId: employee?.id,
      },
      include: {
        shift: true,
      },
    });

    console.log(`   找到 ${allSchedules.length} 条排班记录:`);
    allSchedules.forEach((s: any) => {
      console.log(`   - 班次ID: ${s.shiftId}, 班次名称: ${s.shift?.name}, 状态: ${s.status}`);
    });
    console.log();

    // 3. 检查班次ID=1的排班
    console.log('3. 检查班次ID=1的排班:');
    const scheduleShift1 = await prisma.schedule.findFirst({
      where: {
        scheduleDate: new Date('2026-03-11'),
        employeeId: employee?.id,
        shiftId: 1,
      },
      include: {
        shift: true,
      },
    });

    if (scheduleShift1) {
      console.log(`   ✓ 找到班次ID=1的排班: ${scheduleShift1.shift?.name}`);
    } else {
      console.log(`   ✗ 未找到班次ID=1的排班`);
    }

  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkSchedule();
