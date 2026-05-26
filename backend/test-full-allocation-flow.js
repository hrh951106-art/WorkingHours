const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFullAllocationFlow() {
  console.log('🔍 完整模拟A03分摊计算流程\n');
  console.log('═'.repeat(80));

  // 1. 获取配置（模拟calculateAllocation方法）
  console.log('\n1️⃣ 获取配置:');
  const config = await prisma.allocationConfig.findUnique({
    where: { id: 3, deletedAt: null },
    include: {
      sourceConfig: true,
      rules: {
        where: { deletedAt: null, status: 'ACTIVE' },
        include: {
          targets: true,
        },
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });

  if (!config) {
    console.log('❌ 未找到配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`  ✅ 配置ID: ${config.id}`);
  console.log(`  ✅ 配置名称: ${config.configName}`);
  console.log(`  ✅ 状态: ${config.status}`);
  console.log(`  ✅ sourceConfig存在: ${!!config.sourceConfig}`);
  console.log(`  ✅ 规则数量: ${config.rules.length}`);

  // 2. 解析分摊源配置（模拟allocation.service.ts:2351-2353）
  console.log('\n2️⃣ 解析分摊源配置:');
  const employeeFilter = JSON.parse(config.sourceConfig.employeeFilter || '{}');
  const accountFilter = JSON.parse(config.sourceConfig.accountFilter || '{}');
  const attendanceCodes = JSON.parse(config.sourceConfig.attendanceCodes || '[]');

  console.log(`  员工筛选: ${JSON.stringify(employeeFilter)}`);
  console.log(`  账户筛选: ${JSON.stringify(accountFilter)}`);
  console.log(`  出勤代码: ${JSON.stringify(attendanceCodes)}`);

  // 3. 模拟查询WorkHourResult数据
  console.log('\n3️⃣ 查询WorkHourResult数据:');
  console.log(`  查询条件:`);
  console.log(`    出勤代码: ${JSON.stringify(attendanceCodes)}`);
  console.log(`    状态: DRAFT, CONFIRMED, LOCKED`);

  const whereClause = {
    status: { in: ['DRAFT', 'CONFIRMED', 'LOCKED'] },
  };

  if (attendanceCodes.length > 0) {
    whereClause.definitionAttendanceCodeStr = { in: attendanceCodes };
  }

  const workHours = await prisma.workHourResult.findMany({
    where: whereClause,
    include: {
      employee: {
        include: {
          org: true,
        },
      },
    },
    orderBy: { calcDate: 'desc' },
  });

  console.log(`  ✅ 查询结果: ${workHours.length} 条`);

  if (workHours.length === 0) {
    console.log('\n  ❌ 【问题1】未查询到任何工时数据！');
    console.log('  这就是导致没有分摊结果的原因！');
    await prisma.$disconnect();
    return;
  }

  // 显示前几条数据
  console.log('\n  工时数据示例（前3条）:');
  workHours.slice(0, 3).forEach((wh, idx) => {
    console.log(`    ${idx + 1}. ${wh.calcDate.toISOString().split('T')[0]} | 员工=${wh.employee?.name} | 出勤代码=${wh.definitionAttendanceCodeStr} | 工时=${wh.workHours}h | 账户ID=${wh.employee?.laborAccountId}`);
  });

  // 4. 应用员工筛选
  console.log('\n4️⃣ 应用员工筛选:');
  console.log(`  fieldGroups: ${JSON.stringify(employeeFilter.fieldGroups)}`);

  let filteredWorkHours = workHours;

  if (employeeFilter.fieldGroups && employeeFilter.fieldGroups.length > 0) {
    console.log('  有员工筛选条件，需要进一步过滤');
    // 这里会应用筛选逻辑
  } else {
    console.log('  ✅ 无员工筛选条件，保留所有工时数据');
  }

  // 5. 应用账户筛选
  console.log('\n5️⃣ 应用账户筛选:');
  console.log(`  hierarchySelections: ${JSON.stringify(accountFilter.hierarchySelections)}`);

  if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
    console.log('\n  有账户筛选条件:');
    accountFilter.hierarchySelections.forEach((selection, idx) => {
      console.log(`    ${idx + 1}. levelName=${selection.levelName}, valueIds=${JSON.stringify(selection.valueIds)}`);
    });

    // 检查工时数据的账户是否符合筛选条件
    console.log('\n  检查工时数据的账户归属:');

    const valueIds = accountFilter.hierarchySelections.flatMap(s => s.valueIds || []);

    filteredWorkHours = filteredWorkHours.filter(wh => {
      const accountId = wh.employee?.laborAccountId;
      const match = valueIds.includes(String(accountId)) || valueIds.includes(Number(accountId));

      console.log(`    员工=${wh.employee?.name}, 账户ID=${accountId}, 匹配=${match ? '✅' : '❌'}`);

      return match;
    });

    console.log(`\n  账户筛选后剩余: ${filteredWorkHours.length} 条`);
  } else {
    console.log('  ✅ 无账户筛选条件');
  }

  // 6. 最终结果
  console.log('\n6️⃣ 最终待分摊数据:');
  console.log(`  数据条数: ${filteredWorkHours.length}`);

  if (filteredWorkHours.length === 0) {
    console.log('  ❌ 【问题2】经过筛选后，没有待分摊数据！');
    console.log('\n  可能原因:');
    console.log('    1. 出勤代码筛选：没有A02_LINE的工时数据');
    console.log('    2. 账户筛选：配置了"工厂=大华富阳工厂"，但工时数据不在该账户下');
    console.log('    3. 状态筛选：工时状态不是DRAFT/CONFIRMED/LOCKED');
  } else {
    console.log('  ✅ 有数据可以执行分摊计算');

    const totalHours = filteredWorkHours.reduce((sum, wh) => sum + (wh.workHours || 0), 0);
    console.log(`  总工时: ${totalHours}h`);
  }

  // 7. 检查分摊规则
  console.log('\n7️⃣ 检查分摊规则:');
  if (config.rules.length > 0) {
    const rule = config.rules[0];
    console.log(`  规则ID: ${rule.id}`);
    console.log(`  规则名称: ${rule.ruleName}`);
    console.log(`  规则类型: ${rule.ruleType}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);

    const basisFilter = JSON.parse(rule.basisFilter || '{}');
    const allocationAttendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    const allocationSourceAccounts = JSON.parse(rule.allocationSourceAccounts || '[]');
    const allocationTargetAccounts = JSON.parse(rule.allocationTargetAccounts || '[]');

    console.log(`  basisFilter: ${JSON.stringify(basisFilter)}`);
    console.log(`  allocationAttendanceCodes: ${JSON.stringify(allocationAttendanceCodes)}`);
    console.log(`  allocationSourceAccounts: ${JSON.stringify(allocationSourceAccounts)}`);
    console.log(`  allocationTargetAccounts: ${JSON.stringify(allocationTargetAccounts)}`);

    if (allocationSourceAccounts.length === 0) {
      console.log('\n  ⚠️  【问题3】分摊源账户为空！');
    }
    if (allocationTargetAccounts.length === 0) {
      console.log('  ⚠️  【问题4】分摊目标账户为空！');
    }
  }

  console.log('\n8️⃣ 总结:');
  console.log('═'.repeat(80));

  if (filteredWorkHours.length === 0) {
    console.log('  ❌ 主要问题：没有待分摊的工时数据');
    console.log('\n  排查建议:');
    console.log('    1. 检查账户筛选配置：工厂=大华富阳工厂（ID=4）');
    console.log('    2. 查看WorkHourResult表中的员工laborAccountId是否为4');
    console.log('    3. 如果不是，说明账户筛选条件过滤掉了所有数据');
    console.log('    4. 解决：修改账户筛选条件或修改工时数据的账户归属');
  } else if (config.rules.length === 0) {
    console.log('  ❌ 主要问题：没有配置分摊规则');
  } else {
    console.log('  ✅ 配置和数据都正常');
    console.log('  请检查是否真的执行过分摊计算');
  }

  await prisma.$disconnect();
}

testFullAllocationFlow().catch(console.error);
