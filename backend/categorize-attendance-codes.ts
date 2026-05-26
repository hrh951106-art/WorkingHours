/**
 * 分类现有出勤代码数据
 * 将现有的出勤代码按照功能分类到DEFINITION或CALCULATION
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function categorizeAttendanceCodes() {
  console.log('=== 分类现有出勤代码数据 ===\n');

  // 获取所有出勤代码
  const allCodes = await prisma.attendanceCode.findMany();

  console.log(`共找到 ${allCodes.length} 条出勤代码记录\n`);

  // 分类规则：
  // 1. 有accountLevels配置的 -> CALCULATION（工时计算）
  // 2. 有mappingCode的 -> DEFINITION（出勤代码定义）
  // 3. 有priority>0的 -> CALCULATION（工时计算）
  // 4. 其他 -> DEFINITION（出勤代码定义）

  let definitionCount = 0;
  let calculationCount = 0;

  for (const code of allCodes) {
    let category = 'DEFINITION'; // 默认为出勤代码定义

    // 判断逻辑
    const hasAccountLevels = code.accountLevels && code.accountLevels !== '[]';
    const hasMappingCode = !!code.mappingCode;
    const hasPriority = code.priority > 0;
    const hasCalculationConfig = code.deductMeal || code.includeOutside || code.onlyOutside;

    if (hasAccountLevels || hasPriority || hasCalculationConfig) {
      category = 'CALCULATION';
    } else if (hasMappingCode) {
      category = 'DEFINITION';
    }

    await prisma.attendanceCode.update({
      where: { id: code.id },
      data: { category },
    });

    if (category === 'DEFINITION') {
      definitionCount++;
      console.log(`✓ ${code.code} - ${code.name} -> DEFINITION (出勤代码定义)`);
    } else {
      calculationCount++;
      console.log(`✓ ${code.code} - ${code.name} -> CALCULATION (工时计算)`);
    }
  }

  console.log(`\n=== 分类完成 ===`);
  console.log(`出勤代码定义: ${definitionCount} 条`);
  console.log(`工时计算: ${calculationCount} 条`);

  // 验证分类结果
  console.log(`\n=== 验证分类结果 ===`);
  const definitionCodes = await prisma.attendanceCode.findMany({
    where: { category: 'DEFINITION' },
    orderBy: { code: 'asc' },
  });

  const calculationCodes = await prisma.attendanceCode.findMany({
    where: { category: 'CALCULATION' },
    orderBy: { code: 'asc' },
  });

  console.log(`\n出勤代码定义 (${definitionCodes.length} 条):`);
  definitionCodes.forEach(code => {
    console.log(`  - ${code.code}: ${code.name}`);
  });

  console.log(`\n工时计算 (${calculationCodes.length} 条):`);
  calculationCodes.forEach(code => {
    console.log(`  - ${code.code}: ${code.name}`);
  });

  await prisma.$disconnect();
  console.log('\n✅ 数据分类完成！');
}

categorizeAttendanceCodes()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  });
