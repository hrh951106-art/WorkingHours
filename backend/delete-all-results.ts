import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 删除 CalcResult 和 WorkHourResult 表的所有数据 ===\n');

  // 1. 查询当前记录数
  console.log('1. 查询当前记录数:');
  const calcResultCount = await prisma.calcResult.count();
  const workHourResultCount = await prisma.workHourResult.count();

  console.log(`  CalcResult 表: ${calcResultCount} 条记录`);
  console.log(`  WorkHourResult 表: ${workHourResultCount} 条���录`);

  if (calcResultCount === 0 && workHourResultCount === 0) {
    console.log('\n✓ 两个表都已经是空的，无需删除');
    return;
  }

  // 2. 确认删除
  console.log('\n2. 执行删除操作:');

  // 删除 WorkHourResult（需要先删除，因为它可能有外键关联）
  if (workHourResultCount > 0) {
    console.log('  删除 WorkHourResult 表数据...');
    const workHourDeleteResult = await prisma.workHourResult.deleteMany({});
    console.log(`  ✓ 删除了 ${workHourDeleteResult.count} 条 WorkHourResult 记录`);
  }

  // 删除 CalcResult
  if (calcResultCount > 0) {
    console.log('  删除 CalcResult 表数据...');
    const calcDeleteResult = await prisma.calcResult.deleteMany({});
    console.log(`  ✓ 删除了 ${calcDeleteResult.count} 条 CalcResult 记录`);
  }

  // 3. 验证删除结果
  console.log('\n3. 验证删除结果:');
  const calcResultCountAfter = await prisma.calcResult.count();
  const workHourResultCountAfter = await prisma.workHourResult.count();

  console.log(`  CalcResult 表剩余记录: ${calcResultCountAfter}`);
  console.log(`  WorkHourResult 表剩余记录: ${workHourResultCountAfter}`);

  if (calcResultCountAfter === 0 && workHourResultCountAfter === 0) {
    console.log('\n✅ 所有数据已成功删除！');
  } else {
    console.log('\n⚠️  仍有数据残留，请检查');
  }

  // 4. 显示总结
  console.log('\n4. 删除总结:');
  console.log(`  CalcResult: 删除了 ${calcResultCount - calcResultCountAfter} 条记录`);
  console.log(`  WorkHourResult: 删除了 ${workHourResultCount - workHourResultCountAfter} 条记录`);
  console.log(`  总计删除: ${(calcResultCount - calcResultCountAfter) + (workHourResultCount - workHourResultCountAfter)} 条记录`);
}

main()
  .then(() => console.log('\n完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
