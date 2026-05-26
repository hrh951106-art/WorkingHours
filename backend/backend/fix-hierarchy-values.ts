import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 修复 hierarchyValues 字段 ===\n');

  // 查询所有 hierarchyValues 为 {} 的账户
  const accounts = await prisma.laborAccount.findMany({
    where: {
      hierarchyValues: '{}',
    },
  });

  console.log('找到 ' + accounts.length + ' 个需要修复的账户');

  for (const account of accounts) {
    await prisma.laborAccount.update({
      where: { id: account.id },
      data: {
        hierarchyValues: '[]',
      },
    });
    console.log('修复账户ID: ' + account.id);
  }

  console.log('\n修复完成');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
