import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkshopIndirectAccount() {
  console.log('========================================');
  console.log('检查车间间接设备账户');
  console.log('========================================\n');

  // 1. 查询车间间接设备账户
  const account = await prisma.laborAccount.findFirst({
    where: {
      name: '富阳工厂/W1总装车间/////间接设备',
      status: 'ACTIVE',
    },
  });

  if (!account) {
    console.log('✗ 未找到车间间接设备账户');
    await prisma.$disconnect();
    return;
  }

  console.log('车间间接设备账户:');
  console.log(`  ID: ${account.id}`);
  console.log(`  名称: ${account.name}`);
  console.log(`  类型: ${account.type}`);
  console.log(`  层级: ${account.level}`);
  console.log(`  hierarchyValues: ${account.hierarchyValues || 'NULL'}`);

  // 2. 解析hierarchyValues
  if (account.hierarchyValues) {
    try {
      const hierarchyValues = JSON.parse(account.hierarchyValues);
      console.log('\n解析后的hierarchyValues:');
      console.log(JSON.stringify(hierarchyValues, null, 2));

      console.log('\n检查是否符合L01的筛选条件:');
      console.log(`  车间ID (workshopId): ${hierarchyValues.workshopId || 'NOT FOUND'}`);
      console.log(`  要求的ID: 6 (W1总装车间)`);
      console.log(`  是否匹配: ${hierarchyValues.workshopId === 6 ? '✓' : '✗'}`);

      console.log(`  设备类型: ${hierarchyValues.deviceType || 'NOT FOUND'}`);
      console.log(`  要求的类型: A02`);
      console.log(`  是否匹配: ${hierarchyValues.deviceType === 'A02' ? '✓' : '✗'}`);

    } catch (e) {
      console.log('\n✗ 解析hierarchyValues失败');
    }
  }

  // 3. 检查L01的账户筛选条件
  console.log('\n========================================');
  console.log('L01的账户筛选条件');
  console.log('========================================\n');

  const l01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'L01',
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
    },
  });

  if (l01Config && l01Config.sourceConfig) {
    const accountFilter = JSON.parse(l01Config.sourceConfig.accountFilter || '{}');
    console.log('账户筛选条件:');
    console.log(JSON.stringify(accountFilter, null, 2));

    console.log('\n分析:');
    console.log('  车间层级筛选: valueIds=[6]');
    console.log('  设备类型筛选: valueIds=["A02"]');

    console.log('\n检查车间间接设备账户是否符合筛选条件:');

    // 检查车间
    let matchesWorkshop = false;
    if (account.hierarchyValues) {
      try {
        const hierarchyValues = JSON.parse(account.hierarchyValues);
        if (hierarchyValues.workshopId === 6) {
          console.log('  ✓ 符合车间筛选 (workshopId=6)');
          matchesWorkshop = true;
        } else {
          console.log('  ✗ 不符合车间筛选');
        }
      } catch (e) {
        console.log('  ✗ 解析hierarchyValues失败');
      }
    }

    // 检查设备类型
    let matchesDeviceType = false;
    if (account.hierarchyValues) {
      try {
        const hierarchyValues = JSON.parse(account.hierarchyValues);
        if (hierarchyValues.deviceType === 'A02') {
          console.log('  ✓ 符合设备类型筛选 (deviceType=A02)');
          matchesDeviceType = true;
        } else {
          console.log(`  ✗ 不符合设备类型筛选 (deviceType=${hierarchyValues.deviceType || 'NOT SET'})`);
          console.log(`    建议: 更新账户的hierarchyValues，添加 deviceType: "A02"`);
        }
      } catch (e) {
        console.log('  ✗ 解析hierarchyValues失败');
      }
    }

    if (matchesWorkshop && matchesDeviceType) {
      console.log('\n✓ 账户符合所有筛选条件，应该能被L01选中');
    } else {
      console.log('\n✗ 账户不符合所有筛选条件，L01无法选中此账户');
      console.log('  这就是为什么L01没有源数据来分摊！');
    }
  }

  console.log('\n========================================\n');
}

checkWorkshopIndirectAccount()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
