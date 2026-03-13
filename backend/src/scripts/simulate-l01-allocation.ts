import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateL01Allocation() {
  console.log('========================================');
  console.log('模拟L01分摊执行');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');
  calcDate.setHours(0, 0, 0, 0);

  const startDate = new Date('2026-03-11');
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date('2026-03-11');
  endDate.setHours(23, 59, 59, 999);

  // 1. 查询L01配置
  const l01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'L01',
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
    },
  });

  if (!l01Config) {
    console.log('✗ 未找到L01配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`L01配置ID: ${l01Config.id}`);
  console.log(`配置名称: ${l01Config.configName}\n`);

  // 2. 解析账户筛选条件
  const accountFilter = JSON.parse(l01Config.sourceConfig.accountFilter || '{}');
  console.log('账户筛选条件:');
  console.log(JSON.stringify(accountFilter, null, 2));

  // 3. 查询匹配的账户
  console.log('\n查询匹配的账户:\n');

  const hierarchySelections = accountFilter.hierarchySelections || [];
  console.log(`层级筛选条件数: ${hierarchySelections.length}`);

  // 获取所有有层级值的账户
  const allAccounts = await prisma.laborAccount.findMany({
    where: {
      status: 'ACTIVE',
      hierarchyValues: {
        not: null,
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      hierarchyValues: true,
    },
  });

  console.log(`有层级值的账户总数: ${allAccounts.length}\n`);

  // 筛选符合条件的账户
  const matchedAccounts: any[] = [];

  for (const account of allAccounts) {
    try {
      const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');

      // 检查hierarchyValues是否是数组
      if (!Array.isArray(hierarchyValues)) {
        console.log(`跳过账户 ${account.name}: hierarchyValues不是数组`);
        continue;
      }

      // 检查账户是否满足所有层级筛选条件
      let matchesAll = true;

      for (const selection of hierarchySelections) {
        const { levelId, levelName, valueIds } = selection;

        // 查找账户在该层级的值
        const levelValue = hierarchyValues.find((hv: any) => hv.levelId === levelId);

        if (!levelValue || !levelValue.selectedValue) {
          matchesAll = false;
          break;
        }

        const accountValueId = levelValue.selectedValue.id;

        // 检查账户的层级值是否在筛选条件的valueIds中
        if (!valueIds.includes(accountValueId) && !valueIds.includes(String(accountValueId))) {
          matchesAll = false;
          break;
        }
      }

      if (matchesAll) {
        matchedAccounts.push(account);
        console.log(`✓ 匹配账户: ${account.name} (${account.code})`);
      }
    } catch (e) {
      console.error(`解析账户 ${account.code} 的层级值失败:`, e);
    }
  }

  console.log(`\n最终匹配 ${matchedAccounts.length} 个账户\n`);

  // 4. 查询I04工时记录
  console.log('========================================');
  console.log('查询I04工时记录');
  console.log('========================================\n');

  const i04Code = await prisma.attendanceCode.findFirst({
    where: { code: 'I04' },
  });

  if (!i04Code) {
    console.log('✗ 未找到I04出勤代码');
    await prisma.$disconnect();
    return;
  }

  console.log(`I04出勤代码ID: ${i04Code.id}\n`);

  // 构建查询条件
  const where: any = {
    calcDate: {
      gte: startDate,
      lte: endDate,
    },
    attendanceCodeId: i04Code.id,
  };

  // 添加账户筛选
  if (matchedAccounts.length > 0) {
    where.accountId = {
      in: matchedAccounts.map(a => a.id),
    };
  }

  const calcResults = await prisma.calcResult.findMany({
    where: where,
    include: {
      employee: true,
    },
  });

  console.log(`查询到 ${calcResults.length} 条I04工时记录\n`);

  if (calcResults.length === 0) {
    console.log('✗ 没有待分摊的工时记录');
    console.log('  这就是L01没有创建AllocationResult的原因！');
    await prisma.$disconnect();
    return;
  }

  for (const cr of calcResults) {
    console.log(`员工: ${cr.employee.name} (${cr.employeeNo})`);
    console.log(`  账户: ${cr.accountName}`);
    console.log(`  账户ID: ${cr.accountId}`);
    console.log(`  工时: ${cr.actualHours}`);
    console.log();
  }

  // 5. 检查源账户的workshopId解析
  console.log('========================================');
  console.log('检查源账户的workshopId解析');
  console.log('========================================\n');

  const sourceCalcResult = calcResults[0];

  if (sourceCalcResult.accountId) {
    const sourceAccount = await prisma.laborAccount.findUnique({
      where: { id: sourceCalcResult.accountId },
    });

    if (sourceAccount) {
      console.log(`源账户: ${sourceAccount.name}`);
      console.log(`hierarchyValues: ${sourceAccount.hierarchyValues?.substring(0, 100)}...`);

      let sourceWorkshopId: number | null = null;

      // 使用修复后的解析逻辑
      try {
        const hierarchyValues = JSON.parse(sourceAccount.hierarchyValues || '[]');

        console.log('\n1. hierarchyValues是数组:', Array.isArray(hierarchyValues));

        if (Array.isArray(hierarchyValues)) {
          console.log('2. 数组长度:', hierarchyValues.length);

          const workshopLevel = hierarchyValues.find((hv: any) => hv.levelId === 29);

          if (workshopLevel) {
            console.log('3. 找到车间层级:');
            console.log(`   levelId: ${workshopLevel.levelId}`);
            console.log(`   levelName: ${workshopLevel.name}`);

            if (workshopLevel.selectedValue && workshopLevel.selectedValue.id) {
              sourceWorkshopId = workshopLevel.selectedValue.id;
              console.log(`\n✓ 成功解析出车间ID: ${sourceWorkshopId}`);
            }
          }
        }
      } catch (e) {
        console.log('\n✗ 解析失败:', e);
      }

      // 备用方案：从账户名称解析
      if (!sourceWorkshopId) {
        console.log('\n使用备用方案：从账户名称解析');
        if (sourceAccount.name.includes('W1总装车间')) {
          sourceWorkshopId = 6;
          console.log(`✓ 从账户名称解析出车间ID: ${sourceWorkshopId}`);
        } else if (sourceAccount.name.includes('W2总装车间')) {
          sourceWorkshopId = 9;
          console.log(`✓ 从账户名称解析出车间ID: ${sourceWorkshopId}`);
        }
      }

      console.log(`\n最终车间ID: ${sourceWorkshopId}`);

      if (!sourceWorkshopId) {
        console.log('\n✗ 无法确定源账户所属的车间');
        console.log('  L01会跳过分摊，不创建AllocationResult');
      } else {
        console.log('\n✓ 源账户车间ID确定，可以进行分摊');
      }
    }
  }

  // 6. 检查产线直接工时
  console.log('\n========================================');
  console.log('检查产线直接工时');
  console.log('========================================\n');

  const i01Code = await prisma.attendanceCode.findFirst({
    where: { code: 'I01' },
  });

  if (i01Code) {
    const directHoursResults = await prisma.calcResult.findMany({
      where: {
        calcDate: {
          gte: startDate,
          lte: endDate,
        },
        attendanceCodeId: i01Code.id,
      },
    });

    console.log(`I01直接工时记录总数: ${directHoursResults.length}\n`);

    if (directHoursResults.length === 0) {
      console.log('✗ 没有I01直接工时记录');
      console.log('  无法计算分摊系数');
      console.log('  这可能导致L01无法分摊');
    } else {
      // 按产线分组
      const lineGroups: Record<string, number> = {};
      for (const cr of directHoursResults) {
        // 从账户名称中提取产线名称
        const match = cr.accountName.match(/\/([^/]+产线)\/{5}直接设备/);
        if (match) {
          const lineName = match[1];
          lineGroups[lineName] = (lineGroups[lineName] || 0) + cr.actualHours;
        }
      }

      console.log('各产线直接工时:');
      for (const [lineName, hours] of Object.entries(lineGroups)) {
        console.log(`  ${lineName}: ${hours.toFixed(2)}小时`);
      }

      const totalDirectHours = Object.values(lineGroups).reduce((sum, h) => sum + h, 0);
      console.log(`\n总直接工时: ${totalDirectHours.toFixed(2)}小时`);

      if (totalDirectHours > 0) {
        console.log('\n✓ 有直接工时，可以计算分摊系数');
      } else {
        console.log('\n✗ 总直接工时为0，无法计算分摊系数');
      }
    }
  }

  console.log('\n========================================\n');
}

simulateL01Allocation()
  .catch((e) => {
    console.error('模拟失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
