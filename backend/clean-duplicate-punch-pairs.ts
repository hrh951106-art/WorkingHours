import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 清理重复的摆卡数据 ===\n');

  // 删除所有摆卡数据（包括重复的）
  const deletedCount = await prisma.punchPair.deleteMany({});

  console.log(`✅ 已删除 ${deletedCount.count} 条摆卡数据（包括重复数据）`);
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
