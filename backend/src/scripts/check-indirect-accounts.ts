import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIndirectAccounts() {
  console.log('========================================');
  console.log('检查间接设备账户命名规则');
  console.log('========================================\n');

  // 1. 获取所有产线及其所属车间
  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log('产线及其所属车间:\n');
  for (const line of lines) {
    console.log(`- ${line.name} (${line.code})`);
    console.log(`  workshopName: ${line.workshopName}`);
    console.log(`  workshopId: ${line.workshopId}`);
    console.log();
  }

  // 2. 获取所有间接设备账户
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
  });

  console.log(`找到 ${indirectAccounts.length} 个间接设备账户:\n`);

  for (const account of indirectAccounts) {
    console.log(`- ${account.name}`);
    console.log(`  ID: ${account.id}`);
    console.log(`  Code: ${account.code}`);
    console.log();
  }

  // 3. 分析命名规则
  console.log('========================================');
  console.log('命名规则分析');
  console.log('========================================\n');

  console.log('根据产线信息，正确的账户名称应该是:\n');

  for (const line of lines) {
    const expectedAccountName = `富阳工厂/${line.workshopName}/${line.name}////间接设备`;
    console.log(`${line.name}:`);
    console.log(`  预期账户名: ${expectedAccountName}`);

    // 检查是否存在
    const existingAccount = indirectAccounts.find(acc => acc.name === expectedAccountName);
    if (existingAccount) {
      console.log(`  ✓ 账户存在 (ID: ${existingAccount.id})`);
    } else {
      console.log(`  ✗ 账户不存在，需要创建`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

checkIndirectAccounts()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  });
