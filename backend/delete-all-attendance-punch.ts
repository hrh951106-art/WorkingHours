import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 删除 AttendancePunchPair 表的所有数据 ===\n');

  // 1. 查询当前记录数
  const countBefore = await prisma.attendancePunchPair.count();
  console.log(`1. 当前记录数: ${countBefore}`);

  if (countBefore === 0) {
    console.log('\n表已经是空的，无需删除');
    return;
  }

  // 2. 显示部分数据供确认
  console.log('\n2. 前10条记录预览:');
  const sampleRecords = await prisma.attendancePunchPair.findMany({
    take: 10,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      employeeNo: true,
      punchDate: true,
      workStartPunchTime: true,
      workEndPunchTime: true,
      ruleName: true,
    },
  });

  sampleRecords.forEach((record) => {
    const punchDate = record.punchDate.toISOString().split('T')[0];
    const startTime = record.workStartPunchTime?.toISOString().split('T')[1]?.substring(0, 5) || 'null';
    const endTime = record.workEndPunchTime?.toISOString().split('T')[1]?.substring(0, 5) || 'null';
    console.log(`  ID=${record.id}, 员工=${record.employeeNo}, 日期=${punchDate}, 时间=${startTime}~${endTime}, 规则=${record.ruleName || 'null'}`);
  });

  if (countBefore > 10) {
    console.log(`  ... 还有 ${countBefore - 10} 条记录`);
  }

  // 3. 执行删除
  console.log('\n3. 执行删除操作...');
  const deleteResult = await prisma.attendancePunchPair.deleteMany({});

  console.log(`   ✓ 删除了 ${deleteResult.count} 条记录`);

  // 4. 验证删除结果
  const countAfter = await prisma.attendancePunchPair.count();
  console.log(`\n4. 验证: 当前记录数 = ${countAfter}`);

  if (countAfter === 0) {
    console.log('\n✓ 所有数据已成功删除！');
  } else {
    console.log('\n⚠️  仍有数据残留，请检查');
  }
}

main()
  .then(() => console.log('\n完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
