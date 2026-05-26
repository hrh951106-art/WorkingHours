import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 迁移脚本：将精益工时结果从 attendanceCodeId 迁移到 calculationAttendanceCodeId
 *
 * 逻辑：
 * 1. 查询所有 calculationAttendanceCodeId IS NULL 但有 attendanceCodeId 的记录
 * 2. 通过 DefinitionAttendanceCode 的 code 字段找到对应的 CalculationAttendanceCode
 * 3. 更新记录的 calculationAttendanceCodeId 字段
 */
async function migrateLeanHoursResults() {
  console.log('开始迁移精益工时结果...');

  // 1. 查询所有需要迁移的记录
  const recordsToMigrate = await prisma.calcResult.findMany({
    where: {
      calculationAttendanceCodeId: null,
      attendanceCodeId: { not: null },
    },
  });

  console.log(`找到 ${recordsToMigrate.length} 条需要迁移的记录`);

  if (recordsToMigrate.length === 0) {
    console.log('没有需要迁移的记录');
    return;
  }

  // 2. 获取所有的 DefinitionAttendanceCode 和 CalculationAttendanceCode
  const definitionCodes = await prisma.definitionAttendanceCode.findMany({
    where: { status: 'ACTIVE' },
  });

  const calculationCodes = await prisma.calculationAttendanceCode.findMany({
    where: { status: 'ACTIVE' },
  });

  // 建立 CalculationAttendanceCode 的 code 到 id 的映射
  const calcCodeMap = new Map<string, number>();
  calculationCodes.forEach(code => {
    calcCodeMap.set(code.code, code.id);
  });

  // 建立 DefinitionAttendanceCode 的 id 到 code 的映射
  const defCodeMap = new Map<number, string>();
  definitionCodes.forEach(code => {
    defCodeMap.set(code.id, code.code);
  });

  let migrated = 0;
  let skipped = 0;

  // 3. 逐条更新记录
  for (const record of recordsToMigrate) {
    const defCodeId = record.attendanceCodeId;
    const defCode = defCodeMap.get(defCodeId);

    if (!defCode) {
      console.log(`记录 ID ${record.id}: DefinitionAttendanceCode ID ${defCodeId} 不存在，跳过`);
      skipped++;
      continue;
    }

    // 查找对应的 CalculationAttendanceCode
    const calcCodeId = calcCodeMap.get(defCode);

    if (!calcCodeId) {
      console.log(`记录 ID ${record.id}: 未找到 code=${defCode} 的 CalculationAttendanceCode，跳过`);
      skipped++;
      continue;
    }

    // 更新记录
    await prisma.calcResult.update({
      where: { id: record.id },
      data: { calculationAttendanceCodeId: calcCodeId },
    });

    console.log(`记录 ID ${record.id}: attendanceCodeId=${defCodeId} -> calculationAttendanceCodeId=${calcCodeId} (code=${defCode})`);
    migrated++;
  }

  console.log(`\n迁移完成：`);
  console.log(`- 成功迁移: ${migrated} 条`);
  console.log(`- 跳过: ${skipped} 条`);
}

// 执行迁移
migrateLeanHoursResults()
  .then(() => {
    console.log('迁移脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
