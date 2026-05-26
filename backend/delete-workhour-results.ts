import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 删除工时结果表所有数据 ===\n');

  try {
    // 删除工时结果表（WorkHourResult）
    console.log('正在删除工时结果表数据...');
    const workHourResultCount = await prisma.workHourResult.deleteMany({});
    console.log(`✅ 删除了 ${workHourResultCount.count} 条工时结果记录`);

    console.log('\n=== 删除完成 ===\n');

    // 验证删除结果
    const remainingCount = await prisma.workHourResult.count();
    console.log(`工时结果表剩余记录: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('\n✅ 工时结果表已成功清空');
    } else {
      console.log('\n⚠️ 工时结果表还有数据残留');
    }

  } catch (error: any) {
    console.error('\n❌ 删除数据时出错:', error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n脚本执行成功');
    process.exit(0);
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
