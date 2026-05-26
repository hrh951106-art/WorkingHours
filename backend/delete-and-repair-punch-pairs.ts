import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 删除所有摆卡数据并重新摆卡 ===\n');

  // 1. 删除所有摆卡数据
  const deletedCount = await prisma.punchPair.deleteMany({});
  console.log(`✅ 已删除 ${deletedCount.count} 条摆卡数据`);

  // 2. 删除所有精益工时计算结果（因为它们依赖于摆卡数据）
  const calcDeleted = await prisma.calcResult.deleteMany({});
  console.log(`✅ 已删除 ${calcDeleted.count} 条精益工时计算结果`);

  console.log('\n请在前端页面执行"批量摆卡"来重新生成摆卡数据');
  console.log('或者调用 POST /api/punch/pairing/batch API');
}

main()
  .then(() => {
    console.log('\n✅ 清理完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
