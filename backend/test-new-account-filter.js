const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNewAccountFilter() {
  console.log('🔍 测试新的accountName层级匹配逻辑\n');
  console.log('═'.repeat(80));

  // 模拟分摊配置的hierarchySelections
  const hierarchySelections = [
    {
      levelId: 4,
      level: 1,
      levelName: '工厂',
      valueIds: ['4']  // ID=4的账户是"大华富阳工厂/..."
    }
  ];

  console.log('\n1️⃣ 层级筛选条件:');
  console.log(`  ${JSON.stringify(hierarchySelections, null, 2)}`);

  // 1. 获取valueIds中账户ID对应的accountName，提取对应层级的值
  console.log('\n2️⃣ 提取层级匹配条件:');

  const levelMatchConditions = new Map();

  for (const selection of hierarchySelections) {
    const { level, levelName, valueIds } = selection;

    // 查询这些账户ID对应的账户
    const accounts = await prisma.laborAccount.findMany({
      where: {
        id: { in: valueIds.map((id) => Number(id)) },
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    console.log(`  level=${level}, levelName="${levelName}", 查询到${accounts.length}个账户`);

    // 提取每个账户在该层级的值
    const levelValues = new Set();

    for (const account of accounts) {
      const nameParts = account.name.split('/');
      const levelValue = nameParts[level - 1];

      if (levelValue && levelValue !== '-' && levelValue !== '') {
        levelValues.add(levelValue);
        console.log(`    账户 ${account.name} 的第${level}层: "${levelValue}"`);
      }
    }

    levelMatchConditions.set(level, levelValues);
    console.log(`  第${level}层的允许值: [${Array.from(levelValues).join(', ')}]`);
  }

  // 2. 查询WorkHourResult中使用到的账户
  console.log('\n3️⃣ 查询WorkHourResult中的账户:');

  const workHourAccounts = await prisma.$queryRaw`
    SELECT DISTINCT id, name, code
    FROM "LaborAccount"
    WHERE id IN (
      SELECT DISTINCT "accountId"
      FROM "WorkHourResult"
      WHERE "accountId" IS NOT NULL
    )
  `;

  console.log(`  找到 ${workHourAccounts.length} 个不同账户`);

  // 3. 筛选符合层级条件的账户
  console.log('\n4️⃣ 应用层级筛选:');

  const matchedAccounts = [];

  for (const account of workHourAccounts) {
    const nameParts = account.name.split('/');

    // 检查该账户是否满足所有层级条件
    let matchesAll = true;

    for (const selection of hierarchySelections) {
      const { level, levelName } = selection;
      const allowedValues = levelMatchConditions.get(level);

      if (!allowedValues || allowedValues.size === 0) {
        matchesAll = false;
        break;
      }

      // 获取该账户在该层级的值
      const accountLevelValue = nameParts[level - 1];

      // 检查该层级的值是否在允许的值列表中
      if (!accountLevelValue || !allowedValues.has(accountLevelValue)) {
        matchesAll = false;
        break;
      }
    }

    if (matchesAll) {
      matchedAccounts.push(account);
      console.log(`  ✅ 匹配: ID=${account.id}, ${account.name}`);
    } else {
      console.log(`  ❌ 不匹配: ID=${account.id}, ${account.name}`);
    }
  }

  console.log('\n5️⃣ 结果:');
  console.log(`  匹配账户数: ${matchedAccounts.length}`);
  console.log(`  匹配账户ID: [${matchedAccounts.map(a => a.id).join(', ')}]`);

  // 6. 验证：查询A02_LINE工时数据
  console.log('\n6️⃣ 验证：查询A02_LINE工时数据（应用账户筛选后）:');

  const matchedAccountIds = matchedAccounts.map(a => a.id);

  const workHours = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeStr: 'A02_LINE',
      accountId: { in: matchedAccountIds.length > 0 ? matchedAccountIds : [0] },
    },
    include: {
      employee: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`  查询条件: definitionAttendanceCodeStr='A02_LINE' AND accountId IN (${matchedAccountIds.join(', ')})`);
  console.log(`  结果: ${workHours.length} 条工时记录`);

  if (workHours.length > 0) {
    console.log('\n  工时记录示例（前3条）:');
    workHours.slice(0, 3).forEach((wh, idx) => {
      console.log(`    ${idx + 1}. ${wh.calcDate.toISOString().split('T')[0]} | ${wh.employee.name} | ${wh.definitionAttendanceCodeStr} | ${wh.workHours}h`);
    });
  }

  console.log('\n7️⃣ 结论:');
  if (matchedAccounts.length > 0 && workHours.length > 0) {
    console.log('  ✅ 层级筛选逻辑正常工作！');
    console.log('  ✅ 可以查询到待分摊的工时数据');
    console.log('  ✅ A03分摊规则应该可以正常执行');
  } else if (matchedAccounts.length === 0) {
    console.log('  ❌ 没有匹配的账户，请检查配置');
  } else if (workHours.length === 0) {
    console.log('  ⚠️  账户匹配了，但工时数据为0');
    console.log('     请检查WorkHourResult表中是否有A02_LINE数据');
  }

  await prisma.$disconnect();
}

testNewAccountFilter().catch(console.error);
