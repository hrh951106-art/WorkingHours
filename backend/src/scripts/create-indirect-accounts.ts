import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createIndirectAccounts() {
  console.log('========================================');
  console.log('创建产线间接设备账户');
  console.log('========================================\n');

  // 查找产线信息
  const lines = await prisma.productionLine.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  console.log(`找到 ${lines.length} 条产线:\n`);

  for (const line of lines) {
    console.log(`${line.name} (ID: ${line.id}, 组织: ${line.orgName})`);

    // 检查是否已存在间接设备账户
    const existingAccount = await prisma.laborAccount.findFirst({
      where: {
        name: {
          endsWith: `/${line.orgName}////间接设备`,
        },
      },
    });

    if (existingAccount) {
      console.log(`  已存在间接设备账户: ID ${existingAccount.id}\n`);
      continue;
    }

    // 创建间接设备账户
    // 账户名称格式：富阳工厂/W1总装车间/L1线体////间接设备
    const accountName = `富阳工厂/W1总装车间/${line.orgName}////间接设备`;

    const account = await prisma.laborAccount.create({
      data: {
        code: `AUTO-${Date.now()}`,
        name: accountName,
        type: 'SUB',
        status: 'ACTIVE',
        path: accountName,
        level: 5,
        effectiveDate: new Date('2025-01-01'),
      },
    });

    console.log(`  创建间接设备账户: ID ${account.id}`);
    console.log(`  账户名称: ${account.name}\n`);
  }

  console.log('========================================');
}

createIndirectAccounts()
  .catch((e) => {
    console.error('创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
