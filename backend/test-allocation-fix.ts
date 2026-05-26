import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAllocationFix() {
  console.log('🧪 测试修复后的分摊逻辑\n');

  // 1. 检查WorkHourResult表中的A04_WORKSHOP数据
  console.log('1️⃣ 检查WorkHourResult表中A04_WORKSHOP的数据:');
  const a04WorkshopResults = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeId: 9, // A04_WORKSHOP的ID
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 5,
  });

  console.log(`找到 ${a04WorkshopResults.length} 条A04_WORKSHOP记录`);
  for (const result of a04WorkshopResults) {
    console.log(`  员工: ${result.employeeNo}, 工时: ${result.workHours}, 日期: ${result.calcDate.toISOString().split('T')[0]}, 账户: ${result.accountName}`);
  }

  // 2. 检查分摊配置
  console.log('\n2️⃣ 检查A02分摊配置:');
  const sourceConfig = await prisma.allocationSourceConfig.findUnique({
    where: { configId: 2 },
  });

  if (sourceConfig) {
    const attendanceCodes = JSON.parse(sourceConfig.attendanceCodes || '[]');
    console.log(`  配置的出勤代码: ${attendanceCodes.join(', ')}`);

    // 验证这些代码是否在DefinitionAttendanceCode表中存在
    for (const code of attendanceCodes) {
      const defCode = await prisma.definitionAttendanceCode.findFirst({
        where: { code },
      });
      console.log(`    "${code}": ${defCode ? `✅ 存在 (ID=${defCode.id})` : '❌ 不存在'}`);
    }
  }

  // 3. 统计WorkHourResult中的数据量
  console.log('\n3️⃣ WorkHourResult数据统计:');
  const totalCount = await prisma.workHourResult.count();
  const a04Count = await prisma.workHourResult.count({
    where: { definitionAttendanceCodeId: 9 },
  });
  const a02Count = await prisma.workHourResult.count({
    where: { definitionAttendanceCodeId: 10 },
  });

  console.log(`  总记录数: ${totalCount}`);
  console.log(`  A04_WORKSHOP (车间工时): ${a04Count}`);
  console.log(`  A02_LINE (线体工时): ${a02Count}`);

  // 4. 检查AllocationResult表（分摊结果）
  console.log('\n4️⃣ 检查AllocationResult表:');
  const allocationResults = await prisma.allocationResult.count({
    where: { configId: 2 },
  });
  console.log(`  配置ID=2的分摊结果记录数: ${allocationResults}`);

  if (allocationResults === 0) {
    console.log('  ⚠️ 没有分摊结果，需要执行分摊计算');
  }

  // 5. 模拟分摊查询逻辑
  console.log('\n5️⃣ 模拟分摊查询逻辑:');

  const attendanceCodes = ['A04_WORKSHOP'];
  const definitionCodeMap = await prisma.definitionAttendanceCode.findMany({
    where: { code: { in: attendanceCodes } },
  });
  const definitionCodeIds = definitionCodeMap.map((dc) => dc.id);

  console.log(`  查询的出勤代码: ${attendanceCodes.join(', ')}`);
  console.log(`  解析后的ID列表: ${definitionCodeIds.join(', ')}`);

  // 查询WorkHourResult
  const filteredResults = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeId: { in: definitionCodeIds },
    },
    take: 5,
  });

  console.log(`  查询到的WorkHourResult记录数: ${filteredResults.length}`);
  if (filteredResults.length > 0) {
    console.log('  示例数据:');
    for (const result of filteredResults) {
      console.log(`    员工: ${result.employeeNo}, 工时: ${result.workHours}, 考勤代码: ${result.calcAttendanceCode}`);
    }
  }

  await prisma.$disconnect();
}

testAllocationFix().catch(console.error);
