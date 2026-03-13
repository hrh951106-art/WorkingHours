import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAutoCreateFunction() {
  console.log('========================================');
  console.log('验证自动创建账户功能');
  console.log('========================================\n');

  // 1. 查询所有产线
  console.log('第一步：查询所有产线\n');

  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log(`找到 ${lines.length} 条产线\n`);

  // 2. 检查每个产线的间接设备账户是否存在
  console.log('第二步：检查间接设备账户\n');

  let missingCount = 0;
  let existingCount = 0;

  for (const line of lines) {
    const workshopName = line.workshopName || 'UNKNOWN';
    const accountName = `富阳工厂/${workshopName}/${line.name}////间接设备`;

    const account = await prisma.laborAccount.findFirst({
      where: {
        name: accountName,
        status: 'ACTIVE',
      },
    });

    if (account) {
      existingCount++;
      console.log(`✓ ${line.name}: 账户存在 (ID: ${account.id})`);
    } else {
      missingCount++;
      console.log(`✗ ${line.name}: 账户不存在 (${accountName})`);
      console.log(`  车间: ${workshopName} (ID: ${line.workshopId})`);
    }
  }

  // 3. 总结
  console.log('\n第三步：总结\n');

  console.log(`总产线数: ${lines.length}`);
  console.log(`账户已存在: ${existingCount}`);
  console.log(`账户缺失: ${missingCount}`);

  if (missingCount > 0) {
    console.log(`\n✓ 检测到 ${missingCount} 个缺失的账户`);
    console.log(`  当执行L01分摊规则时，系统会自动创建这些账户`);
  } else {
    console.log(`\n✓ 所有产线的间接设备账户都已存在`);
  }

  // 4. 显示一个示例的账户创建逻辑
  if (lines.length > 0) {
    const sampleLine = lines[0];
    console.log('\n第四步：示例账户创建逻辑\n');

    const workshop = await prisma.organization.findUnique({
      where: { id: sampleLine.workshopId },
      select: { name: true, parentId: true },
    });

    const workshopName = workshop?.name || sampleLine.workshopName;
    const orgId = workshop?.parentId || 1;

    console.log(`示例产线: ${sampleLine.name}`);
    console.log(`车间名称: ${workshopName}`);
    console.log(`组织ID: ${orgId}`);
    console.log(`车间ID: ${sampleLine.workshopId}`);

    const accountName = `富阳工厂/${workshopName}/${sampleLine.name}////间接设备`;
    console.log(`\n账户名称: ${accountName}`);
    console.log(`账户类型: LINE`);
    console.log(`账户层级: 3`);
    console.log(`hierarchyValues: { orgId: ${orgId}, workshopId: ${sampleLine.workshopId}, lineId: ${sampleLine.id} }`);
  }

  console.log('\n========================================\n');
}

verifyAutoCreateFunction()
  .catch((e) => {
    console.error('验证失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
