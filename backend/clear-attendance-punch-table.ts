import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 清空 AttendancePunchPair 表 ===\n');

  // 1. 查询当前记录数
  const countBefore = await prisma.attendancePunchPair.count();
  console.log(`当前记录数: ${countBefore}`);

  if (countBefore === 0) {
    console.log('✓ 表已经是空的');
    return;
  }

  // 2. 执行删除
  console.log('\n执行删除操作...');
  const deleteResult = await prisma.attendancePunchPair.deleteMany({});

  console.log(`✓ 删除了 ${deleteResult.count} 条记录`);

  // 3. 验证删除结果
  const countAfter = await prisma.attendancePunchPair.count();
  console.log(`\n验证: 当前记录数 = ${countAfter}`);

  if (countAfter === 0) {
    console.log('\n✓ 表已成功清空！');
  } else {
    console.log('\n⚠️  仍有数据残留');
  }
}

main()
  .then(() => console.log('\n完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
