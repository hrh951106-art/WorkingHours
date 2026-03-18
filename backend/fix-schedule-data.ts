import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixScheduleData() {
  try {
    console.log('=== 修复排班数据 ===\n');

    // 检查是否已存在早班排班
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        employeeId: 4,  // A02
        scheduleDate: new Date('2026-03-11'),
        shiftId: 1,     // 早班
      },
    });

    if (existingSchedule) {
      console.log('A02在2026-03-11已有早班排班，无需添加');
      return;
    }

    // 创建早班排班记录
    const newSchedule = await prisma.schedule.create({
      data: {
        employeeId: 4,
        shiftId: 1,
        scheduleDate: new Date('2026-03-11'),
        status: 'ACTIVE',
        pushStatus: 'PENDING',
      },
    });

    console.log('✓ 成功为A02添加早班排班记录:');
    console.log(`  排班ID: ${newSchedule.id}`);
    console.log(`  员工ID: ${newSchedule.employeeId}`);
    console.log(`  班次ID: ${newSchedule.shiftId}`);
    console.log(`  日期: ${newSchedule.scheduleDate}`);

  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixScheduleData();
