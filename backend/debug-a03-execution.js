const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugA03Execution() {
  console.log('🔍 A03分摊规则执行结果诊断\n');
  console.log('═'.repeat(80));

  // 1. 检查最近的分摊结果
  console.log('\n1️⃣ 最近的分摊结果记录:');
  const recentResults = await prisma.$queryRaw`
    SELECT "batchNo", "configId", "recordDate", "resultCount",
           "createdAt", "updatedAt"
    FROM "AllocationResult"
    ORDER BY "createdAt" DESC
    LIMIT 10
  `;

  if (recentResults && recentResults.length > 0) {
    console.log(`  找到 ${recentResults.length} 条分摊结果:\n`);
    recentResults.forEach((r, idx) => {
      console.log(`  ${idx + 1}. 批次号: ${r.batchNo}`);
      console.log(`     配置ID: ${r.configId}`);
      console.log(`     日期: ${r.recordDate.toISOString().split('T')[0]}`);
      console.log(`     结果数量: ${r.resultCount}`);
      console.log(`     状态: ${r.status || '无'}`);
      console.log(`     创建时间: ${r.createdAt.toISOString()}`);
      console.log('');
    });
  } else {
    console.log('  ❌ 未找到任何分摊结果记录');
  }

  // 2. 检查ID=3的配置（A03）
  console.log('\n2️⃣ A03配置检查:');
  const config = await prisma.allocationConfig.findUnique({
    where: { id: 3 },
    include: {
      sourceConfig: true,
      rules: {
        where: { deletedAt: null, status: 'ACTIVE' },
        include: { targets: true },
      },
    },
  });

  if (config) {
    console.log(`  配置ID: ${config.id}`);
    console.log(`  配置名称: ${config.configName}`);
    console.log(`  状态: ${config.status}`);
    console.log(`  sourceConfig存在: ${!!config.sourceConfig}`);

    if (config.sourceConfig) {
      const sourceConfig = config.sourceConfig;
      console.log(`  出勤代码: ${JSON.stringify(sourceConfig.attendanceCodes)}`);
      console.log(`  账户筛选: ${JSON.stringify(sourceConfig.accountFilter)}`);
    }

    console.log(`  规则数量: ${config.rules.length}`);

    if (config.rules.length > 0) {
      const rule = config.rules[0];
      console.log(`\n  规则详情:`);
      console.log(`    ID: ${rule.id}`);
      console.log(`    名称: ${rule.ruleName}`);
      console.log(`    类型: ${rule.ruleType}`);
      console.log(`    分摊依据: ${rule.allocationBasis}`);
      console.log(`    targets数量: ${rule.targets.length}`);

      if (rule.targets.length === 0) {
        console.log(`    ⚠️  【问题】没有配置分摊目标！`);
      }
    }
  }

  // 3. 检查WorkHourResult数据
  console.log('\n3️⃣ WorkHourResult数据检查:');

  const sourceConfig = config?.sourceConfig;
  if (sourceConfig && sourceConfig.attendanceCodes) {
    const attendanceCodes = JSON.parse(sourceConfig.attendanceCodes || '[]');

    console.log(`  查询条件: definitionAttendanceCodeStr IN (${JSON.stringify(attendanceCodes)})`);

    const workHours = await prisma.workHourResult.findMany({
      where: {
        definitionAttendanceCodeStr: { in: attendanceCodes },
        status: { in: ['DRAFT', 'CONFIRMED', 'LOCKED'] },
      },
      select: {
        id: true,
        calcDate: true,
        employeeId: true,
        definitionAttendanceCodeStr: true,
        workHours: true,
        accountId: true,
        accountName: true,
        employee: {
          select: {
            name: true,
            laborAccountId: true,
          },
        },
      },
    });

    console.log(`  查询结果: ${workHours.length} 条`);

    if (workHours.length === 0) {
      console.log(`  ❌ 【问题】没有查询到工时数据！`);
      console.log(`  可能原因:`);
      console.log(`    1. 出勤代码配置不正确`);
      console.log(`    2. 工时状态不是DRAFT/CONFIRMED/LOCKED`);
      console.log(`    3. 日期范围内没有数据`);
    } else {
      console.log(`  ✅ 找到工时数据`);

      // 检查账户筛选
      if (sourceConfig.accountFilter) {
        const accountFilter = JSON.parse(sourceConfig.accountFilter || '{}');

        if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
          console.log(`\n  应用账户筛选: ${JSON.stringify(accountFilter.hierarchySelections)}`);

          // 统计每个accountId的记录数
          const accountCounts = {};
          workHours.forEach(wh => {
            const accId = wh.accountId || 'null';
            accountCounts[accId] = (accountCounts[accId] || 0) + 1;
          });

          console.log(`  账户分布:`);
          Object.entries(accountCounts).forEach(([accId, count]) => {
            console.log(`    accountId=${accId}: ${count}条`);
          });
        }
      }
    }
  }

  // 4. 检查分摊目标配置
  console.log('\n4️⃣ 分摊目标配置检查:');

  if (config && config.rules.length > 0) {
    const rule = config.rules[0];

    console.log(`  targets数量: ${rule.targets.length}`);

    if (rule.targets.length === 0) {
      console.log(`  ❌ 【关键问题】没有配置分摊目标！`);
      console.log(`  影响：即使有工时数据，也无法生成分摊结果`);
      console.log(`  原因：分摊目标为空，系统不知道要将工时分摊到哪些账户`);
    } else {
      console.log(`  分摊目标列表:`);
      rule.targets.forEach((target, idx) => {
        console.log(`    ${idx + 1}. 账户ID=${target.accountId}, 权重=${target.weight || 0}`);
      });
    }
  }

  // 5. 总结
  console.log('\n5️⃣ 问题诊断总结:');
  console.log('═'.repeat(80));

  const hasResults = recentResults && recentResults.length > 0;
  const hasConfig = !!config;
  const hasSourceConfig = config?.sourceConfig;
  const hasRules = config?.rules.length > 0;
  const hasTargets = config?.rules[0]?.targets.length > 0;

  const workHoursCount = await getWorkHourCount(prisma, config);

  console.log(`  分摊结果记录: ${hasResults ? '✅ 有' : '❌ 无'}`);
  console.log(`  配置存在: ${hasConfig ? '✅ 是' : '❌ 否'}`);
  console.log(`  sourceConfig: ${hasSourceConfig ? '✅ 有' : '❌ 无'}`);
  console.log(`  分摊规则: ${hasRules ? '✅ 有' : '❌ 无'}`);
  console.log(`  分摊目标: ${hasTargets ? '✅ 有' : '❌ 无'} ⚠️`);
  console.log(`  工时数据: ${workHoursCount}条`);

  console.log('\n6️⃣ 诊断结论:');

  if (!hasTargets) {
    console.log('  ❌ 【主要问题】没有配置分摊目标');
    console.log('\n  解决方案:');
    console.log('    1. 进入前端：成本分摊 → 分摊配置');
    console.log('    2. 找到"车间分摊"配置（ID=3）');
    console.log('    3. 编辑配置，在"分摊规则"中添加分摊目标');
    console.log('    4. 配置要将工时分摊到哪些账户以及分摊权重');
    console.log('    5. 保存后重新执行分摊计算');
  } else if (workHoursCount === 0) {
    console.log('  ❌ 【主要问题】没有待分摊的工时数据');
    console.log('\n  可能原因：账户筛选过滤掉了所有数据');
  } else {
    console.log('  ⚠️  配置和数据都有，但没有结果');
    console.log('  请检查后端日志查看具体错误');
  }

  await prisma.$disconnect();
}

async function getWorkHourCount(prisma, config) {
  if (!config?.sourceConfig) return 0;

  const attendanceCodes = JSON.parse(config.sourceConfig.attendanceCodes || '[]');

  if (attendanceCodes.length === 0) return 0;

  const count = await prisma.workHourResult.count({
    where: {
      definitionAttendanceCodeStr: { in: attendanceCodes },
      status: { in: ['DRAFT', 'CONFIRMED', 'LOCKED'] },
    },
  });

  return count;
}

debugA03Execution().catch(console.error);
