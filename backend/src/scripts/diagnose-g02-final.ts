import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseG02Final() {
  console.log('========================================');
  console.log('G02规则问题最终诊断');
  console.log('========================================\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  // 1. 查询I05出勤代码的工时记录
  console.log('第一步：查询I05出勤代码的工时记录\n');

  const i05AttendanceCode = await prisma.attendanceCode.findUnique({
    where: { code: 'I05' },
  });

  if (!i05AttendanceCode) {
    console.log('✗ 未找到出勤代码 I05');
    await prisma.$disconnect();
    return;
  }

  const i05Records = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
      attendanceCodeId: i05AttendanceCode.id,
    },
    include: {
      employee: true,
    },
  });

  console.log(`找到 ${i05Records.length} 条 I05 出勤代码的工时记录\n`);

  // 按账户分组统计
  const accountStats: Record<string, number> = {};
  for (const record of i05Records) {
    const account = record.accountName || 'NULL';
    accountStats[account] = (accountStats[account] || 0) + 1;
  }

  console.log('按账户统计:');
  for (const [account, count] of Object.entries(accountStats)) {
    console.log(`  ${account}: ${count} 条`);
  }

  // 2. 检查是否有间接设备的工时记录
  console.log('\n第二步：检查间接设备账户的工时记录\n');

  const indirectRecords = i05Records.filter(record =>
    record.accountName && record.accountName.includes('间接设备')
  );

  console.log(`I05出勤代码中，间接设备账户的工时记录数: ${indirectRecords.length}\n`);

  if (indirectRecords.length === 0) {
    console.log('✗ I05出勤代码的工时记录中没有间接设备账户的记录');
    console.log('   这就是G02规则找不到待分摊工时记录的原因！\n');
  } else {
    console.log('✓ 找到间接设备账户的工时记录:');
    for (const record of indirectRecords) {
      console.log(`  ${record.calcDate.toISOString().split('T')[0]} - ${record.employee?.name || 'Unknown'} - ${record.accountName} - ${record.actualHours}小时`);
    }
    console.log();
  }

  // 3. 检查G02规则的配置
  console.log('第三步：检查G02规则的账户筛选条件\n');

  const sourceConfig = await prisma.allocationSourceConfig.findUnique({
    where: { configId: 15 },
  });

  if (sourceConfig) {
    const accountFilter = JSON.parse(sourceConfig.accountFilter || '{}');
    console.log('账户筛选配置:');
    console.log(JSON.stringify(accountFilter, null, 2));

    if (accountFilter.hierarchySelections) {
      console.log('\n层级筛选条件:');
      for (const selection of accountFilter.hierarchySelections) {
        console.log(`  层级 ${selection.level}: ${selection.levelName} (ID: ${selection.levelId})`);
        console.log(`    选中值: ${selection.valueIds.join(', ')}`);

        // 查询该层级的配置
        const hierarchy = await prisma.accountHierarchyConfig.findUnique({
          where: { id: selection.levelId },
        });
        if (hierarchy) {
          console.log(`    映射类型: ${hierarchy.mappingType}`);
          console.log(`    映射值: ${hierarchy.mappingValue || '无'}`);
        }
      }
    }
  }

  // 4. 查询所有间接设备账户
  console.log('\n第四步：查询所有间接设备账户\n');

  const allIndirectAccounts = await prisma.laborAccount.findMany({
    where: {
      name: {
        endsWith: '间接设备',
      },
      status: 'ACTIVE',
    },
  });

  console.log(`找到 ${allIndirectAccounts.length} 个间接设备账户:\n`);

  for (const account of allIndirectAccounts) {
    console.log(`  ${account.name} (ID: ${account.id})`);

    // 检查该账户是否有I05的工时记录
    const count = await prisma.calcResult.count({
      where: {
        calcDate: {
          gte: startDate,
          lte: endDate,
        },
        attendanceCodeId: i05AttendanceCode.id,
        accountId: account.id,
      },
    });

    console.log(`    I05工时记录数: ${count}`);
  }

  // 5. 总结和解决方案
  console.log('\n========================================');
  console.log('问题诊断总结');
  console.log('========================================\n');

  console.log('问题原因:');
  console.log('1. G02规则配置的出勤代码是 I05（工厂工时）');
  console.log('2. G02规则配置的账户筛选条件是"设备类型=间接设备"');
  console.log(`3. 在指定日期范围内，I05出勤代码有 ${i05Records.length} 条工时记录`);
  console.log(`4. 但这 ${i05Records.length} 条记录都在"直接设备"账户下，不在"间接设备"账户下`);
  console.log(`5. 间接设备账户没有I05的工时记录（${indirectRecords.length} 条）\n`);

  console.log('解决方案:\n');
  console.log('方案A：修改G02规则的账户筛选条件');
  console.log('  1. 在G02规则配置中，将账户筛选条件改为"直接设备"');
  console.log('  2. 或者移除设备类型筛选，选择所有设备类型\n');

  console.log('方案B：先生成间接设备的工时记录');
  console.log('  1. 确保有I05出勤代码在间接设备账户的工时记录');
  console.log('  2. 如果没有，需要先生成这些记录\n');

  console.log('方案C：修改G02规则的出勤代码');
  console.log('  1. 将G02规则的出勤代码改为实际有工时记录的出勤代码');
  console.log('  2. 例如改为I01（线体班内工时）或I03（线体工时）\n');

  console.log('推荐方案：');
  console.log('根据业务需求，如果需要将直接设备的工时分摊到间接设备，');
  console.log('应该使用方案A，修改账户筛选条件为"直接设备"。\n');

  console.log('========================================\n');
}

diagnoseG02Final()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
