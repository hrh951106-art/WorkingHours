import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixWorkshopNames() {
  console.log('========================================');
  console.log('修复产线车间名称和间接设备账户');
  console.log('========================================\n');

  // 第一步：修复 L1 和 L2 产线的 workshopName
  console.log('第一步：修复产线的 workshopName 字段\n');

  const linesToUpdate = [
    { name: 'L1产线', workshopId: 6, correctName: 'W1总装车间' },
    { name: 'L2产线', workshopId: 6, correctName: 'W1总装车间' },
  ];

  for (const lineInfo of linesToUpdate) {
    console.log(`----------------------------------------`);
    console.log(`产线: ${lineInfo.name}`);
    console.log(`----------------------------------------`);

    // 查询产线当前信息
    const line = await prisma.productionLine.findFirst({
      where: {
        name: lineInfo.name,
        deletedAt: null,
      },
    });

    if (!line) {
      console.log(`  ✗ 未找到该产线`);
      console.log();
      continue;
    }

    console.log(`  当前 workshopId: ${line.workshopId}`);
    console.log(`  当前 workshopName: ${line.workshopName || 'NULL'}`);
    console.log(`  正确 workshopName: ${lineInfo.correctName}`);

    // 验证 workshopId 是否正确
    if (line.workshopId !== lineInfo.workshopId) {
      console.log(`  ⚠ workshopId 不匹配，期望 ${lineInfo.workshopId}`);
    }

    // 更新 workshopName
    if (line.workshopName !== lineInfo.correctName) {
      await prisma.productionLine.update({
        where: { id: line.id },
        data: {
          workshopName: lineInfo.correctName,
          workshopId: lineInfo.workshopId,
        },
      });
      console.log(`  ✓ 已更新 workshopName 为 "${lineInfo.correctName}"`);
    } else {
      console.log(`  ✓ workshopName 已经正确`);
    }

    console.log();
  }

  // 第二步：重命名间接设备账户
  console.log('\n第二步：重命名间接设备账户\n');

  const accountsToUpdate = [
    { oldName: '富阳工厂/A01车间/L1产线////间接设备', newName: '富阳工厂/W1总装车间/L1产线////间接设备' },
    { oldName: '富阳工厂/A01车间/L2产线////间接设备', newName: '富阳工厂/W1总装车间/L2产线////间接设备' },
  ];

  for (const accountInfo of accountsToUpdate) {
    console.log(`----------------------------------------`);
    console.log(`旧账户名: ${accountInfo.oldName}`);
    console.log(`新账户名: ${accountInfo.newName}`);
    console.log(`----------------------------------------`);

    // 查找旧账户
    const oldAccount = await prisma.laborAccount.findFirst({
      where: {
        name: accountInfo.oldName,
        status: 'ACTIVE',
      },
    });

    if (!oldAccount) {
      console.log(`  ✗ 未找到旧账户`);
      console.log();
      continue;
    }

    console.log(`  找到旧账户 (ID: ${oldAccount.id})`);

    // 检查新账户是否已存在
    const newAccount = await prisma.laborAccount.findFirst({
      where: {
        name: accountInfo.newName,
        status: 'ACTIVE',
      },
    });

    if (newAccount) {
      console.log(`  ⚠ 新账户名已存在 (ID: ${newAccount.id})，跳过重命名`);
      console.log();
      continue;
    }

    // 重命名账户
    await prisma.laborAccount.update({
      where: { id: oldAccount.id },
      data: {
        name: accountInfo.newName,
        namePath: accountInfo.newName,
      },
    });

    console.log(`  ✓ 已重命名为 "${accountInfo.newName}"`);
    console.log();
  }

  console.log('========================================');
  console.log('修复完成');
  console.log('========================================\n');

  // 验证修复结果
  console.log('验证修复结果:\n');

  const verificationLines = ['L1产线', 'L2产线', 'L3产线'];
  for (const lineName of verificationLines) {
    const line = await prisma.productionLine.findFirst({
      where: { name: lineName, deletedAt: null },
    });

    if (line) {
      const accountName = `富阳工厂/${line.workshopName}/${line.name}////间接设备`;
      const account = await prisma.laborAccount.findFirst({
        where: {
          name: accountName,
          status: 'ACTIVE',
        },
      });

      console.log(`${lineName}:`);
      console.log(`  workshopName: ${line.workshopName}`);
      console.log(`  账户: ${account ? '✓ 存在 (ID: ' + account.id + ')' : '✗ 不存在'}`);
    }
  }

  console.log('\n========================================\n');
  console.log('下一步操作:');
  console.log('1. 重启后端服务');
  console.log('2. 重新执行工时分摊操作');
  console.log('3. 验证分摊结果');
  console.log('\n========================================');
}

fixWorkshopNames()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
