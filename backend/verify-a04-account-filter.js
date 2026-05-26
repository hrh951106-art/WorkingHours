const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyA04AccountFilter() {
  console.log('🔍 验证A04账户筛选逻辑\n');
  console.log('═'.repeat(80));

  // 1. 获取A04配置的账户筛选
  console.log('\n1️⃣ 获取账户筛选配置:');

  const sourceConfig = await prisma.allocationSourceConfig.findFirst({
    where: { configId: 4 },
  });

  if (!sourceConfig || !sourceConfig.accountFilter) {
    console.log('  ❌ 未找到账户筛选配置');
    await prisma.$disconnect();
    return;
  }

  const accountFilter = typeof sourceConfig.accountFilter === 'string'
    ? JSON.parse(sourceConfig.accountFilter)
    : sourceConfig.accountFilter;

  console.log('  账户筛选配置:');
  console.log(JSON.stringify(accountFilter, null, 2));

  if (!accountFilter.hierarchySelections || accountFilter.hierarchySelections.length === 0) {
    console.log('\n  ⚠️  没有层级筛选条件');
    await prisma.$disconnect();
    return;
  }

  // 2. 模拟账户筛选逻辑
  console.log('\n2️⃣ 模拟账户筛选逻辑:');

  const hierarchySelections = accountFilter.hierarchySelections;
  const levelMatchConditions = new Map();

  for (const selection of hierarchySelections) {
    const { levelId, level, levelName, valueIds } = selection;

    console.log(`\n  处理层级: ${levelName} (level=${level})`);
    console.log(`    valueIds: ${JSON.stringify(valueIds)}`);

    // 转换valueIds为数字
    const numericValueIds = valueIds.map(id => Number(id));
    console.log(`    转换后的ID: ${JSON.stringify(numericValueIds)}`);

    // 查询这些账户
    const accounts = await prisma.laborAccount.findMany({
      where: {
        id: { in: numericValueIds },
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    console.log(`    查询到 ${accounts.length} 个账户:`);
    accounts.forEach(acc => {
      console.log(`      ID=${acc.id}, name="${acc.name}", code="${acc.code}"`);
    });

    // 提取每个账户在该层级的值
    const levelValues = new Set();

    for (const account of accounts) {
      const nameParts = account.name.split('/');
      const levelValue = nameParts[level - 1];

      if (levelValue && levelValue !== '-' && levelValue !== '') {
        levelValues.add(levelValue);
        console.log(`      ✓ 账户 "${account.name}" 的第${level}层值: "${levelValue}"`);
      }
    }

    levelMatchConditions.set(level, levelValues);
    console.log(`    层级${level}(${levelName})的可选值: [${Array.from(levelValues).join(', ')}]`);
  }

  // 3. 查询工时数据中使用的账户
  console.log('\n3️⃣ 查询工时数据中的账户:');

  const workHourAccounts = await prisma.$queryRaw`
    SELECT DISTINCT id, name, code
    FROM "LaborAccount"
    WHERE id IN (
      SELECT DISTINCT "accountId"
      FROM "WorkHourResult"
      WHERE "accountId" IS NOT NULL
        AND "definitionAttendanceCodeStr" = 'A04_WORKSHOP'
    )
  `;

  console.log(`  找到 ${workHourAccounts.length} 个工时数据中使用的账户:`);
  workHourAccounts.forEach(acc => {
    console.log(`    ID=${acc.id}, name="${acc.name}"`);
  });

  // 4. 筛选符合层级条件的账户
  console.log('\n4️⃣ 筛选符合层级条件的账户:');

  const matchedAccounts = [];

  for (const account of workHourAccounts) {
    const nameParts = account.name.split('/');
    console.log(`\n  检查账户: ${account.name}`);

    let matchesAll = true;

    for (const selection of hierarchySelections) {
      const { level, levelName } = selection;
      const allowedValues = levelMatchConditions.get(level);

      if (!allowedValues || allowedValues.size === 0) {
        console.log(`    层级${level}: 没有可选值 ❌`);
        matchesAll = false;
        break;
      }

      const accountLevelValue = nameParts[level - 1];
      console.log(`    层级${level}(${levelName}): 值="${accountLevelValue}", 允许=[${Array.from(allowedValues).join(', ')}]`);

      if (!accountLevelValue || !allowedValues.has(accountLevelValue)) {
        console.log(`    结果: 不匹配 ❌`);
        matchesAll = false;
        break;
      } else {
        console.log(`    结果: 匹配 ✓`);
      }
    }

    if (matchesAll) {
      matchedAccounts.push(account);
      console.log(`  ✓ 账户 "${account.name}" 匹配成功`);
    }
  }

  console.log(`\n  最终匹配 ${matchedAccounts.length} 个账户`);

  // 5. 检查工时数据
  console.log('\n5️⃣ 检查匹配账户的工时数据:');

  if (matchedAccounts.length > 0) {
    const matchedAccountIds = matchedAccounts.map(a => a.id);

    const workHours = await prisma.workHourResult.findMany({
      where: {
        accountId: { in: matchedAccountIds },
        definitionAttendanceCodeStr: 'A04_WORKSHOP',
        status: { in: ['DRAFT', 'CONFIRMED', 'LOCKED'] },
      },
    });

    console.log(`  找到 ${workHours.length} 条工时记录`);

    if (workHours.length > 0) {
      workHours.forEach((wh, idx) => {
        const dateStr = wh.calcDate.toISOString().split('T')[0];
        console.log(`  ${idx + 1}. ${dateStr} | ${wh.workHours}h | ${wh.accountName}`);
      });
    } else {
      console.log('  ❌ 没有工时数据');
    }
  } else {
    console.log('  ❌ 没有匹配的账户，所以没有工时数据可分摊');
  }

  // 6. 问题诊断
  console.log('\n6️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  if (matchedAccounts.length === 0) {
    console.log('  ❌ 【主要问题】账户筛选过滤掉了所有数据');
    console.log('  原因分析:');
    console.log('    1. 账户筛选条件可能过于严格');
    console.log('    2. 工时数据中的账户与筛选条件不匹配');
    console.log('    3. 可能需要调整筛选条件或检查账户数据');
    console.log('\n  解决方案:');
    console.log('    1. 放宽账户筛选条件（例如：不筛选特定账户）');
    console.log('    2. 确保工时数据的账户符合筛选条件');
    console.log('    3. 检查账户ID和账户名称是否对应正确');
  } else if (matchedAccounts.length > 0) {
    const matchedAccountIds = matchedAccounts.map(a => a.id);

    const workHoursCount = await prisma.workHourResult.count({
      where: {
        accountId: { in: matchedAccountIds },
        definitionAttendanceCodeStr: 'A04_WORKSHOP',
        status: { in: ['DRAFT', 'CONFIRMED', 'LOCKED'] },
      },
    });

    if (workHoursCount === 0) {
      console.log('  ⚠️  【问题】有匹配的账户，但这些账户没有A04_WORKSHOP的工时数据');
      console.log('  建议：检查这些账户是否有其他出勤代码的工时数据');
    } else {
      console.log('  ✅ 账户筛选和工时数据都正常');
      console.log('  应该可以正常执行分摊计算');
    }
  }

  await prisma.$disconnect();
}

verifyA04AccountFilter().catch(console.error);
