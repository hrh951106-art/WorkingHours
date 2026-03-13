import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixIndirectAccounts() {
  console.log('========================================');
  console.log('修复间接设备账户');
  console.log('========================================\n');

  // 1. 获取所有产线
  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log(`找到 ${lines.length} 条产线\n`);

  let createdCount = 0;
  let existingCount = 0;
  let deletedCount = 0;

  // 2. 先删除所有使用错误车间名称的账户
  console.log('步骤1: 删除使用错误车间名称的账户');
  console.log('----------------------------------------\n');

  const wrongAccounts = await prisma.laborAccount.findMany({
    where: {
      name: {
        contains: 'W1总装车间',
      },
      status: 'ACTIVE',
    },
  });

  for (const account of wrongAccounts) {
    await prisma.laborAccount.update({
      where: { id: account.id },
      data: { status: 'DELETED' },
    });
    console.log(`✓ 删除错误账户: ${account.name} (ID: ${account.id})`);
    deletedCount++;
  }

  console.log(`\n共删除 ${deletedCount} 个错误账户\n`);

  // 3. 为每条产线创建正确名称的账户
  console.log('步骤2: 创建正确名称的账户');
  console.log('----------------------------------------\n');

  for (const line of lines) {
    const correctAccountName = `富阳工厂/${line.workshopName}/${line.name}////间接设备`;
    // 使用时间戳确保code唯一
    const accountCode = `AUTO-${Date.now()}-${line.code}_INDIRECT`;

    console.log(`处理产线: ${line.name} (${line.code})`);
    console.log(`  所属车间: ${line.workshopName}`);
    console.log(`  正确账户名: ${correctAccountName}`);

    // 检查是否已存在正确名称的账户
    const existingAccount = await prisma.laborAccount.findFirst({
      where: {
        name: correctAccountName,
        status: 'ACTIVE',
      },
    });

    if (existingAccount) {
      console.log(`  ✓ 账户已存在 (ID: ${existingAccount.id})`);
      existingCount++;
    } else {
      // 查找车间级别的账户作为父级
      let parentAccount = await prisma.laborAccount.findFirst({
        where: {
          name: `富阳工厂/${line.workshopName}`,
          status: 'ACTIVE',
        },
      });

      // 如果车间账户不存在，尝试查找工厂账户
      if (!parentAccount) {
        parentAccount = await prisma.laborAccount.findFirst({
          where: {
            name: '富阳工厂',
            status: 'ACTIVE',
          },
        });
      }

      const newAccount = await prisma.laborAccount.create({
        data: {
          code: accountCode,
          name: correctAccountName,
          type: 'LINE',
          level: 3,
          path: '',
          namePath: correctAccountName,
          parentId: parentAccount?.id || null,
          employeeId: null,
          effectiveDate: new Date(),
          status: 'ACTIVE',
          usageType: 'SHIFT',
          hierarchyValues: JSON.stringify({
            orgId: line.orgId,
            orgName: line.orgName,
            workshopId: line.workshopId,
            workshopName: line.workshopName,
            lineId: line.id,
            lineCode: line.code,
            lineName: line.name,
          }),
        },
      });

      console.log(`  ✓ 创建成功 (ID: ${newAccount.id})`);
      createdCount++;
    }

    console.log();
  }

  console.log('========================================');
  console.log('修复完成');
  console.log('========================================\n');

  console.log(`总计: ${lines.length} 条产线`);
  console.log(`删除错误账户: ${deletedCount} 个`);
  console.log(`已存在正确账户: ${existingCount} 个`);
  console.log(`新创建正确账户: ${createdCount} 个`);

  console.log('\n========================================');
  console.log('下一步操作');
  console.log('========================================\n');

  console.log('1. 等待后端服务自动重新加载（watch模式）');
  console.log('2. 在前端界面执行G02分摊操作');
  console.log('3. 验证分摊结果');

  console.log('\n========================================');

  await prisma.$disconnect();
}

fixIndirectAccounts()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  });
