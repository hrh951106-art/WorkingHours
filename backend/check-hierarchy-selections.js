const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHierarchySelections() {
  console.log('🔍 检查hierarchySelections的存储内容\n');
  console.log('═'.repeat(80));

  // 1. 查询AllocationSourceConfig的accountFilter
  const sourceConfigs = await prisma.$queryRaw`
    SELECT id, "configId", "accountFilter"
    FROM "AllocationSourceConfig"
    WHERE "configId" = 3
  `;

  if (sourceConfigs && sourceConfigs.length > 0) {
    const sc = sourceConfigs[0];
    console.log('\n1️⃣ AllocationSourceConfig的accountFilter:');
    console.log(`  原始值: ${sc.accountFilter}`);

    try {
      const accountFilter = JSON.parse(sc.accountFilter || '{}');
      console.log(`\n  解析后的结构:`);
      console.log(`  ${JSON.stringify(accountFilter, null, 2)}`);

      if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
        console.log(`\n  hierarchySelections详情:`);
        accountFilter.hierarchySelections.forEach((selection, idx) => {
          console.log(`    ${idx + 1}. levelId=${selection.levelId}, level=${selection.level}, levelName="${selection.levelName}"`);
          console.log(`       valueIds=${JSON.stringify(selection.valueIds)}`);
          console.log(`       valueIds类型: ${typeof selection.valueIds[0]}`);

          // 如果valueIds是数字，查询对应的账户名称
          if (selection.valueIds && selection.valueIds.length > 0) {
            const firstValueId = selection.valueIds[0];
            console.log(`       第一个valueId: ${firstValueId}`);

            // 查询该账户的完整信息
            prisma.$queryRaw`
              SELECT id, name, code, path
              FROM "LaborAccount"
              WHERE id = ${Number(firstValueId)}
            `.then(accounts => {
              if (accounts && accounts.length > 0) {
                const acc = accounts[0];
                console.log(`       对应账户: ID=${acc.id}, name="${acc.name}", path="${acc.path}"`);

                // 提取层级名称
                const nameParts = acc.name.split('/');
                const pathParts = acc.path.split('/');

                console.log(`       accountName层级: [${nameParts.map(p => `"${p}"`).join(', ')}]`);
                console.log(`       accountPath层级: [${pathParts.map(p => `"${p}"`).join(', ')}]`);

                console.log(`       第${selection.level}层应该是: "${nameParts[selection.level - 1] || pathParts[selection.level - 1]}"`);
              }
            }).catch(e => {
              console.log(`       查询账户失败: ${e.message}`);
            });
          }
        });
      }
    } catch (e) {
      console.log(`  ❌ 解析失败: ${e.message}`);
    }
  }

  // 2. 查询所有LaborAccount的accountName
  console.log('\n\n2️⃣ WorkHourResult中的accountName示例:');
  const workHours = await prisma.$queryRaw`
    SELECT DISTINCT "accountId", "accountName"
    FROM "WorkHourResult"
    WHERE "accountId" IS NOT NULL
    LIMIT 10
  `;

  workHours.forEach((wh, idx) => {
    console.log(`  ${idx + 1}. accountId=${wh.accountId}, accountName="${wh.accountName}"`);
    const parts = wh.accountName.split('/');
    console.log(`     层级: [${parts.map((p, i) => `[${i}]"${p}""`).join(', ')}]`);
    console.log('');
  });

  // 3. 检查层级配置
  console.log('\n3️⃣ AccountHierarchyConfig配置:');
  const hierarchyConfigs = await prisma.$queryRaw`
    SELECT id, name, level, "parentId", status
    FROM "AccountHierarchyConfig"
    ORDER BY level ASC
    LIMIT 10
  `;

  hierarchyConfigs.forEach((hc) => {
    console.log(`  ID=${hc.id}, level=${hc.level}, name="${hc.name}", 状态=${hc.status}`);
  });

  await prisma.$disconnect();
}

checkHierarchySelections().catch(console.error);
