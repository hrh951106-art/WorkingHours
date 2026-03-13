import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMissingIndirectAccounts() {
  console.log('========================================');
  console.log('创建缺失的间接设备账户');
  console.log('========================================\n');

  const accountsToCreate = [
    {
      originalId: 137,
      name: '富阳工厂/W1总装车间/////间接设备',
      type: 'WORKSHOP',
      level: 2,
      hierarchyValues: { orgId: 1, workshopId: 6 },
    },
    {
      originalId: 145,
      name: '富阳工厂//////间接设备',
      type: 'ORG',
      level: 1,
      hierarchyValues: { orgId: 1 },
    },
  ];

  for (const accountData of accountsToCreate) {
    // 先按ID查找（如果账户被删除了）
    let existingAccount = await prisma.laborAccount.findFirst({
      where: { id: accountData.originalId },
    });

    // 如果找不到，按名称查找
    if (!existingAccount) {
      existingAccount = await prisma.laborAccount.findFirst({
        where: { name: accountData.name },
      });
    }

    if (!existingAccount) {
      console.log('创建账户:', accountData.name);

      try {
        const newAccount = await prisma.laborAccount.create({
          data: {
            name: accountData.name,
            code: 'INDIRECT_' + accountData.originalId,
            type: accountData.type,
            level: accountData.level,
            path: '/' + accountData.name,
            namePath: '/' + accountData.name,
            hierarchyValues: JSON.stringify(accountData.hierarchyValues),
            status: 'ACTIVE',
            effectiveDate: new Date('2020-01-01'),
          },
        });

        console.log('成功创建账户:', newAccount.name, '新ID:', newAccount.id);

        // 更新CalcResult中的accountId
        await prisma.calcResult.updateMany({
          where: {
            accountId: accountData.originalId,
          },
          data: {
            accountId: newAccount.id,
          },
        });

        console.log('已更新CalcResult中的accountId引用');
      } catch (error: any) {
        console.log('创建失败:', error.message);
      }
    } else {
      console.log('账户已存在:', existingAccount.name, 'ID:', existingAccount.id, 'status:', existingAccount.status);

      // 如果账户存在但状态不是ACTIVE，恢复它
      if (existingAccount.status !== 'ACTIVE') {
        console.log('账户状态不是ACTIVE，恢复为ACTIVE');
        await prisma.laborAccount.update({
          where: { id: existingAccount.id },
          data: { status: 'ACTIVE' },
        });
      }
    }
    console.log();
  }

  await prisma.$disconnect();
}

createMissingIndirectAccounts()
  .catch((e) => {
    console.error('创建失败:', e);
    process.exit(1);
  });
