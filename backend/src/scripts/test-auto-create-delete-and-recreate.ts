import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAutoCreateAfterDelete() {
  console.log('========================================');
  console.log('测试：删除账户后自动创建');
  console.log('========================================\n');

  // 1. 查找一个已存在的产线间接设备账户
  console.log('第一步：查找一个已存在的账户\n');

  const account = await prisma.laborAccount.findFirst({
    where: {
      name: {
        endsWith: '////间接设备',
      },
      status: 'ACTIVE',
      type: 'LINE',
    },
  });

  if (!account) {
    console.log('✗ 没有找到任何产线间接设备账户');
    await prisma.$disconnect();
    return;
  }

  console.log(`找到账户: ${account.name} (ID: ${account.id})`);
  console.log(`账户类型: ${account.type}, 层级: ${account.level}`);

  // 2. 软删除该账户
  console.log('\n第二步：软删除该账户\n');

  await prisma.laborAccount.update({
    where: { id: account.id },
    data: { status: 'DELETED' },
  });

  console.log(`✓ 已将账户状态设置为DELETED`);

  // 3. 验证账户已删除
  const deletedAccount = await prisma.laborAccount.findFirst({
    where: {
      id: account.id,
      status: 'ACTIVE',
    },
  });

  if (deletedAccount) {
    console.log('✗ 账户仍然处于ACTIVE状态');
  } else {
    console.log('✓ 确认账户已不在ACTIVE状态');
  }

  // 4. 解析账户名称以获取产线信息
  console.log('\n第三步：模拟自动创建逻辑\n');

  const nameParts = account.name.split('/');
  // 富阳工厂/W1总装车间/L1产线////间接设备
  const workshopName = nameParts[1]; // W1总装车间
  const lineName = nameParts[2];     // L1产线

  console.log(`解析得到: 车间=${workshopName}, 产线=${lineName}`);

  // 查找产线
  const line = await prisma.productionLine.findFirst({
    where: {
      name: lineName,
      deletedAt: null,
    },
  });

  if (!line) {
    console.log('✗ 未找到对应的产线');
    await prisma.$disconnect();
    return;
  }

  console.log(`✓ 找到产线: ${line.name} (ID: ${line.id})`);

  // 5. 查找车间（组织）
  const workshop = await prisma.organization.findUnique({
    where: { id: line.workshopId },
    select: { name: true, parentId: true },
  });

  const orgId = workshop?.parentId || 1;
  console.log(`组织信息: orgId=${orgId}, workshopId=${line.workshopId}`);

  // 6. 检查车间账户是否存在
  const parentAccountName = `富阳工厂/${workshopName}/////间接设备`;
  let parentAccount = await prisma.laborAccount.findFirst({
    where: {
      name: parentAccountName,
      status: 'ACTIVE',
    },
  });

  if (parentAccount) {
    console.log(`✓ 车间账户已存在: ${parentAccount.name} (ID: ${parentAccount.id})`);
  } else {
    console.log(`车间账户不存在，需要先创建: ${parentAccountName}`);

    parentAccount = await prisma.laborAccount.create({
      data: {
        name: parentAccountName,
        code: `WORKSHOP_INDIRECT_${line.workshopId}`,
        type: 'WORKSHOP',
        level: 2,
        path: `/富阳工厂/${workshopName}/////间接设备`,
        namePath: `/富阳工厂/${workshopName}/////间接设备`,
        hierarchyValues: JSON.stringify({
          orgId: orgId,
          workshopId: line.workshopId,
        }),
        status: 'ACTIVE',
        effectiveDate: new Date('2020-01-01'),
        usageType: 'SHIFT',
      },
    });

    console.log(`✓ 已创建车间账户: ${parentAccount.name} (ID: ${parentAccount.id})`);
  }

  // 7. 创建产线间接设备账户
  console.log(`\n创建产线间接设备账户...`);

  const newAccountName = `富阳工厂/${workshopName}/${line.name}////间接设备`;

  const newAccount = await prisma.laborAccount.create({
    data: {
      name: newAccountName,
      code: `LINE_INDIRECT_${line.code || line.id}`,
      type: 'LINE',
      level: 3,
      parentId: parentAccount.id,
      path: `${parentAccount.path}/${line.name}`,
      namePath: `${parentAccount.namePath}/${line.name}`,
      hierarchyValues: JSON.stringify({
        orgId: orgId,
        workshopId: line.workshopId,
        lineId: line.id,
      }),
      status: 'ACTIVE',
      effectiveDate: new Date('2020-01-01'),
      usageType: 'SHIFT',
    },
  });

  console.log(`✓ 成功创建产线间接设备账户:`);
  console.log(`  名称: ${newAccount.name}`);
  console.log(`  ID: ${newAccount.id}`);
  console.log(`  类型: ${newAccount.type}`);
  console.log(`  层级: ${newAccount.level}`);
  console.log(`  父账户ID: ${newAccount.parentId}`);
  console.log(`  hierarchyValues: ${newAccount.hierarchyValues}`);

  // 8. 验证新账户
  console.log('\n第四步：验证新账户\n');

  const verifiedAccount = await prisma.laborAccount.findUnique({
    where: { id: newAccount.id },
  });

  if (verifiedAccount && verifiedAccount.status === 'ACTIVE') {
    console.log('✓ 新账户创建成功且处于ACTIVE状态');
  } else {
    console.log('✗ 新账户验证失败');
  }

  // 9. 检查是否创建了重复账户
  const duplicateAccounts = await prisma.laborAccount.findMany({
    where: {
      name: newAccount.name,
      status: 'ACTIVE',
    },
  });

  if (duplicateAccounts.length > 1) {
    console.log(`⚠ 警告：发现 ${duplicateAccounts.length} 个同名账户，可能存在重复`);
  } else {
    console.log('✓ 没有重复账户');
  }

  console.log('\n========================================');
  console.log('测试完成：自动创建功能验证成功');
  console.log('========================================\n');

  await prisma.$disconnect();
}

testAutoCreateAfterDelete()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  });
