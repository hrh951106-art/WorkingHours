import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkshopAccounts() {
  console.log('========================================');
  console.log('检查车间相关的劳动力账户');
  console.log('========================================\n');

  // 查找所有包含"W1总装车间"和"W2总装车间"的账户
  const workshops = ['W1总装车间', 'W2总装车间', 'A01车间'];

  for (const workshop of workshops) {
    console.log(`----------------------------------------`);
    console.log(`车间: ${workshop}`);
    console.log(`----------------------------------------`);

    // 查找包含该车间的账户
    const accounts = await prisma.laborAccount.findMany({
      where: {
        name: {
          contains: workshop,
        },
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (accounts.length > 0) {
      console.log(`找到 ${accounts.length} 个账户:\n`);
      for (const acc of accounts) {
        console.log(`  - ${acc.name}`);
        console.log(`    ID: ${acc.id}, 类型: ${acc.type}, 层级: ${acc.level}`);
        console.log(`    父账户ID: ${acc.parentId}`);
      }
    } else {
      console.log(`  未找到包含"${workshop}"的账户`);
    }
    console.log();
  }

  // 查找所有间接设备账户
  console.log('========================================');
  console.log('所有间接设备账户');
  console.log('========================================\n');

  const indirectAccounts = await prisma.laborAccount.findMany({
    where: {
      name: {
        endsWith: '////间接设备',
      },
      status: 'ACTIVE',
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log(`找到 ${indirectAccounts.length} 个间接设备账户:\n`);
  for (const acc of indirectAccounts) {
    console.log(`  - ${acc.name} (ID: ${acc.id})`);
  }

  console.log('\n========================================');
}

checkWorkshopAccounts()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
