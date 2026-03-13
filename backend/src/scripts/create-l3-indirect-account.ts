import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createL3IndirectAccount() {
  console.log('========================================');
  console.log('创建L3的间接设备账户');
  console.log('========================================\n');

  // 1. 查找L3产线
  console.log('1. 查找L3产线:');
  console.log('----------------------------------------');
  const l3Line = await prisma.productionLine.findFirst({
    where: {
      code: 'LINE_L3',
    },
  });

  if (!l3Line) {
    console.log('未找到L3产线');
    await prisma.$disconnect();
    return;
  }

  console.log(`找到L3产线: ${l3Line.name} (ID: ${l3Line.id})`);
  console.log(`  工厂: ${l3Line.orgName} (ID: ${l3Line.orgId})`);
  console.log(`  车间: ${l3Line.workshopName} (ID: ${l3Line.workshopId})`);
  console.log();

  // 2. 查找参考账户（L1或L2的间接设备账户）
  console.log('2. 查找参考账户:');
  console.log('----------------------------------------');

  // 查找L1的间接设备账户
  const l1IndirectAccount = await prisma.laborAccount.findFirst({
    where: {
      name: {
        endsWith: 'L1线体////间接设备',
      },
    },
  });

  if (!l1IndirectAccount) {
    console.log('未找到L1的间接设备账户作为参考');
    await prisma.$disconnect();
    return;
  }

  console.log(`参考账户: ${l1IndirectAccount.name}`);
  console.log(`  ID: ${l1IndirectAccount.id}`);
  console.log(`  类型: ${l1IndirectAccount.type}`);
  console.log(`  级别: ${l1IndirectAccount.level}`);
  console.log(`  父账户ID: ${l1IndirectAccount.parentId}`);
  console.log();

  // 3. 检查L3的间接设备账户是否已存在
  console.log('3. 检查L3的间接设备账户:');
  console.log('----------------------------------------');

  const existingL3Account = await prisma.laborAccount.findFirst({
    where: {
      name: {
        endsWith: 'L3产线////间接设备',
      },
    },
  });

  if (existingL3Account) {
    console.log(`L3的间接设备账户已存在: ${existingL3Account.name} (ID: ${existingL3Account.id})`);
    await prisma.$disconnect();
    return;
  }

  // 4. 创建L3的间接设备账户
  console.log('4. 创建L3的间接设备账户:');
  console.log('----------------------------------------');

  // 获取富阳工厂的间接设备账户作为父级
  const factoryIndirectAccount = await prisma.laborAccount.findFirst({
    where: {
      name: '富阳工厂/间接设备',
    },
  });

  if (!factoryIndirectAccount) {
    console.log('未找到富阳工厂的间接设备账户');
    await prisma.$disconnect();
    return;
  }

  console.log(`父级账户: ${factoryIndirectAccount.name} (ID: ${factoryIndirectAccount.id})`);

  // 构建账户路径
  const accountName = `富阳工厂/W1总装车间/${l3Line.name}////间接设备`;
  const accountCode = `AUTO-${Date.now()}`;
  const accountPath = `${factoryIndirectAccount.path}/${l3Line.id}`;
  const accountNamePath = `${factoryIndirectAccount.namePath}/W1总装车间/${l3Line.name}/间接设备`;

  const l3IndirectAccount = await prisma.laborAccount.create({
    data: {
      name: accountName,
      code: accountCode,
      type: 'SUB',
      level: 5,
      path: accountPath,
      namePath: accountNamePath,
      parentId: factoryIndirectAccount.id,
      employeeId: null,
      effectiveDate: new Date('2026-01-01'),
      expiryDate: new Date('2099-12-31'),
      status: 'ACTIVE',
      usageType: 'SHIFT',
    },
  });

  console.log(`\n✓ 已创建L3的间接设备账户:`);
  console.log(`  名称: ${l3IndirectAccount.name}`);
  console.log(`  代码: ${l3IndirectAccount.code}`);
  console.log(`  ID: ${l3IndirectAccount.id}`);
  console.log(`  类型: ${l3IndirectAccount.type}`);
  console.log(`  级别: ${l3IndirectAccount.level}`);
  console.log(`  父账户ID: ${l3IndirectAccount.parentId}`);
  console.log();

  // 5. 验证创建结果
  console.log('========================================');
  console.log('验证创建结果');
  console.log('========================================\n');

  console.log('所有间接设备账户:');
  const allIndirectAccounts = await prisma.laborAccount.findMany({
    where: {
      name: {
        endsWith: '////间接设备',
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  for (const account of allIndirectAccounts) {
    console.log(`  - ${account.name}`);
    console.log(`    ID: ${account.id}, 类型: ${account.type}, 级别: ${account.level}`);
  }

  console.log('\n========================================');
  console.log('创建完成');
  console.log('========================================\n');

  console.log('✓ L3产线现在有了间接设备账户');
  console.log('✓ 可以接收分摊的间接工时');
  console.log('\n现在可以重新执行G01配置的分摊操作！');
  console.log('========================================');
}

createL3IndirectAccount()
  .catch((e) => {
    console.error('创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
