import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAllocationFixV2() {
  console.log('🧪 测试修复后的分摊逻辑 (使用 definitionAttendanceCodeStr)\n');

  // 1. 检查WorkHourResult表中A04_WORKSHOP的数据
  console.log('1️⃣ 检查WorkHourResult表中A04_WORKSHOP的数据:');
  const a04WorkshopResults = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeStr: 'A04_WORKSHOP',
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 5,
  });

  console.log(`找到 ${a04WorkshopResults.length} 条A04_WORKSHOP记录`);
  for (const result of a04WorkshopResults) {
    console.log(`  员工: ${result.employeeNo}, 工时: ${result.workHours}, 日期: ${result.calcDate.toISOString().split('T')[0]}, 账户: ${result.accountName}`);
    console.log(`    definitionAttendanceCodeId: ${result.definitionAttendanceCodeId}, definitionAttendanceCodeStr: ${result.definitionAttendanceCodeStr}`);
  }

  // 2. 模拟分摊查询逻辑（使用字符串筛选）
  console.log('\n2️⃣ 模拟分摊查询逻辑 (使用 definitionAttendanceCodeStr):');

  const attendanceCodes = ['A04_WORKSHOP'];
  console.log(`  查询的出勤代码: ${attendanceCodes.join(', ')}`);

  // 查询WorkHourResult（使用definitionAttendanceCodeStr筛选）
  const filteredResults = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeStr: { in: attendanceCodes },
    },
    take: 5,
  });

  console.log(`  查询到的WorkHourResult记录数: ${filteredResults.length}`);
  if (filteredResults.length > 0) {
    console.log('  示例数据:');
    for (const result of filteredResults) {
      console.log(`    员工: ${result.employeeNo}, 工时: ${result.workHours}`);
      console.log(`      definitionAttendanceCodeId: ${result.definitionAttendanceCodeId}`);
      console.log(`      definitionAttendanceCodeStr: ${result.definitionAttendanceCodeStr}`);
      console.log(`      calcAttendanceCode: ${result.calcAttendanceCode}`);
    }
  }

  // 3. 统计WorkHourResult中的数据量
  console.log('\n3️⃣ WorkHourResult数据统计:');
  const totalCount = await prisma.workHourResult.count();
  const a04ByStr = await prisma.workHourResult.count({
    where: { definitionAttendanceCodeStr: 'A04_WORKSHOP' },
  });
  const a02ByStr = await prisma.workHourResult.count({
    where: { definitionAttendanceCodeStr: 'A02_LINE' },
  });

  console.log(`  总记录数: ${totalCount}`);
  console.log(`  A04_WORKSHOP (按字符串查询): ${a04ByStr}`);
  console.log(`  A02_LINE (按字符串查询): ${a02ByStr}`);

  await prisma.$disconnect();
}

testAllocationFixV2().catch(console.error);
