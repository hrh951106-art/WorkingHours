import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 更新孤立的记录（引用了不存在的 DefinitionAttendanceCode）
 * 为它们分配默认的 CalculationAttendanceCode
 */
async function updateOrphanedRecords() {
  console.log('开始更新孤立记录...');

  // 使用 A01 (工序工时, id=4) 作为默认值
  const DEFAULT_CALC_ATTENDANCE_CODE_ID = 4;

  // 更新所有引用了不存在的 DefinitionAttendanceCode 的记录
  const result = await prisma.calcResult.updateMany({
    where: {
      calculationAttendanceCodeId: null,
      attendanceCodeId: { in: [4, 5, 6, 7] }, // 这些 ID 在 DefinitionAttendanceCode 中不存在
    },
    data: {
      calculationAttendanceCodeId: DEFAULT_CALC_ATTENDANCE_CODE_ID,
    },
  });

  console.log(`更新了 ${result.count} 条记录`);

  // 处理 attendanceCodeId=9 (A04_WORKSHOP) 的记录
  // 映射到 A04 (车间工时, id=3)
  const result2 = await prisma.calcResult.updateMany({
    where: {
      calculationAttendanceCodeId: null,
      attendanceCodeId: 9,
    },
    data: {
      calculationAttendanceCodeId: 3, // A04 车间工时
    },
  });

  console.log(`更新了 ${result2.count} 条 A04_WORKSHOP 记录`);

  console.log('更新完成！');
}

updateOrphanedRecords()
  .then(() => {
    console.log('脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
