const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkA03Scopes() {
  console.log('🔍 检查分摊范围配置\n');
  console.log('═'.repeat(80));

  // 1. 检查分摊范围ID=5的配置
  console.log('\n1️⃣ 分摊范围配置 (ID=5):');
  const scopeConfig = await prisma.$queryRaw`
    SELECT id, level, name, "mappingType", "mappingValue", "dataSourceId", sort, status
    FROM "AccountHierarchyConfig"
    WHERE id = 5
  `;

  if (scopeConfig && scopeConfig.length > 0) {
    const scope = scopeConfig[0];
    console.log(`  ID: ${scope.id}`);
    console.log(`  层级: ${scope.level}`);
    console.log(`  名称: ${scope.name}`);
    console.log(`  映射类型: ${scope.mappingType}`);
    console.log(`  映射值: ${scope.mappingValue || '(无)'}`);
    console.log(`  数据源ID: ${scope.dataSourceId || '(无)'}`);
    console.log(`  排序: ${scope.sort}`);
    console.log(`  状态: ${scope.status}`);
  } else {
    console.log('  ❌ 未找到分摊范围ID=5的配置');
  }

  // 2. 查看所有层级配置
  console.log('\n2️⃣ 所有层级配置:');
  const allScopes = await prisma.$queryRaw`
    SELECT id, level, name, "mappingType", "mappingValue"
    FROM "AccountHierarchyConfig"
    WHERE status = 'ACTIVE'
    ORDER BY level ASC
  `;

  if (allScopes && allScopes.length > 0) {
    console.log(`  找到 ${allScopes.length} 个层级配置:\n`);
    allScopes.forEach((s, idx) => {
      const marker = s.id === 5 ? '👉 ' : '   ';
      console.log(`  ${marker}${idx + 1}. ID=${s.id}, level=${s.level}, name=${s.name}, type=${s.mappingType}, value=${s.mappingValue || '(无)'}`);
    });
  }

  // 3. 检查工时数据中的账户信息
  console.log('\n3️⃣ 工时数据的账户信息:');

  const workHours = await prisma.$queryRaw`
    SELECT "accountId", "accountName"
    FROM "WorkHourResult"
    WHERE "definitionAttendanceCodeStr" = 'A02_LINE'
      AND status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
    LIMIT 10
  `;

  if (workHours && workHours.length > 0) {
    console.log(`  找到 ${workHours.length} 条工时记录:\n`);

    // 统计账户分布
    const accountCounts = {};
    workHours.forEach(wh => {
      const accName = wh.accountName || '(无账户)';
      accountCounts[accName] = (accountCounts[accName] || 0) + 1;
    });

    console.log('  账户分布:');
    Object.entries(accountCounts).forEach(([accName, count]) => {
      console.log(`    ${accName}: ${count}条`);
    });

    console.log('\n  账户详情:');
    workHours.forEach((wh, idx) => {
      console.log(`    ${idx + 1}. 账户ID=${wh.accountId}, 名称=${wh.accountName}`);

      // 解析账户名称的层级
      if (wh.accountName) {
        const parts = wh.accountName.split('/');
        console.log(`       层级1(工厂): ${parts[0] || '(无)'}`);
        console.log(`       层级2(车间): ${parts[1] || '(无)'}`);
        console.log(`       层级3(产线): ${parts[2] || '(无)'}`);
        console.log(`       层级4(工序): ${parts[3] || '(无)'}`);
      }
      console.log('');
    });
  }

  // 4. 检查开线计划数据
  console.log('\n4️⃣ 开线计划数据检查:');

  // 获取最近的计划日期
  const lineShifts = await prisma.$queryRaw`
    SELECT "scheduleDate", "shiftId", "shiftName", "accountId", "accountName",
           "orgId", "orgName", "participateInAllocation"
    FROM "LineShift"
    WHERE "deletedAt" IS NULL
      AND status = 'ACTIVE'
    ORDER BY "scheduleDate" DESC
    LIMIT 10
  `;

  if (lineShifts && lineShifts.length > 0) {
    console.log(`  找到 ${lineShifts.length} 条开线计划记录:\n`);

    // 按日期分组
    const byDate = {};
    lineShifts.forEach(ls => {
      const date = ls.scheduleDate.toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(ls);
    });

    Object.entries(byDate).forEach(([date, shifts]) => {
      console.log(`  日期: ${date}, 记录数: ${shifts.length}`);
      shifts.forEach((ls, idx) => {
        console.log(`    ${idx + 1}. 班次=${ls.shiftName}, 账户=${ls.accountName || '(无)'}, 组织=${ls.orgName || '(无)'}, 参与分摊=${ls.participateInAllocation}`);
      });
      console.log('');
    });
  } else {
    console.log('  ❌ 没有开线计划数据');
  }

  // 5. 检查分摊范围ID=5对应的层级
  console.log('\n5️⃣ 分摊范围分析:');

  if (scopeConfig && scopeConfig.length > 0) {
    const scope = scopeConfig[0];
    const targetLevel = scope.level;

    console.log(`  分摊范围层级: ${targetLevel}`);
    console.log(`  分摊范围名称: ${scope.name}`);

    // 从工时数据中提取该层级的值
    console.log('\n  从工时账户名称中提取该层级:');
    const uniqueAccounts = [...new Set(workHours.map(wh => wh.accountName))];

    uniqueAccounts.forEach(accName => {
      if (!accName) return;

      const parts = accName.split('/');
      const levelValue = parts[targetLevel - 1]; // 数组索引从0开始

      console.log(`    账户: ${accName}`);
      console.log(`      层级${targetLevel}(${scope.name}): ${levelValue || '(空或占位符)'}`);
    });

    // 检查开线计划中是否有对应层级的账户
    console.log('\n  在开线计划中查找对应层级的数据:');
    if (lineShifts && lineShifts.length > 0) {
      const matchCount = lineShifts.filter(ls => {
        if (!ls.accountName) return false;

        const parts = ls.accountName.split('/');
        const levelValue = parts[targetLevel - 1];

        // 简单检查：如果该层级有值
        return levelValue && levelValue !== '-';
      }).length;

      console.log(`    找到 ${matchCount}/${lineShifts.length} 条开线计划在层级${targetLevel}有值`);
    }
  }

  // 6. 检查是否有分摊结果
  console.log('\n6️⃣ 分摊结果检查:');

  const results = await prisma.$queryRaw`
    SELECT "batchNo", "recordDate", "resultCount", status, "createdAt"
    FROM "AllocationResult"
    WHERE "configId" = 3
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;

  if (results && results.length > 0) {
    console.log(`  找到 ${results.length} 条分摊结果:`);
    results.forEach((r, idx) => {
      console.log(`    ${idx + 1}. 批次=${r.batchNo}, 日期=${r.recordDate.toISOString().split('T')[0]}, 结果数=${r.resultCount}, 状态=${r.status || '无'}`);
    });
  } else {
    console.log('  ❌ 没有分摊结果');
  }

  // 7. 问题诊断
  console.log('\n7️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  const issues = [];

  if (!scopeConfig || scopeConfig.length === 0) {
    issues.push('❌ 分摊范围ID=5的配置不存在');
  }

  if (workHours && workHours.length > 0) {
    const hasAccountName = workHours.some(wh => wh.accountName);
    if (!hasAccountName) {
      issues.push('❌ 工时数据中没有账户名称');
    }
  }

  if (lineShifts && lineShifts.length === 0) {
    issues.push('❌ 没有开线计划数据');
  }

  if (results && results.length === 0) {
    issues.push('❌ 没有分摊结果记录');
  }

  if (issues.length > 0) {
    console.log('  发现的问题:');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('  ✅ 配置和数据都正常');
    console.log('  ⚠️  但没有分摊结果，可能是以下原因:');
    console.log('     1. 分摊计算逻辑问题');
    console.log('     2. 工时数据与开线计划无法匹配');
    console.log('     3. 账户筛选过滤掉了所有数据');
  }

  await prisma.$disconnect();
}

checkA03Scopes().catch(console.error);
