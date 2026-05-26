const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScopeAndLine() {
  console.log('🔍 检查分摊范围和产线配置\n');
  console.log('═'.repeat(80));

  // 1. 查看所有表名
  console.log('\n1️⃣ 查找所有表:');
  const allTables = await prisma.$queryRaw`
    SELECT name
    FROM "sqlite_schema"
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `;

  const scopeTables = allTables.filter(t => t.name.toLowerCase().includes('scope'));
  const lineTables = allTables.filter(t => t.name.toLowerCase().includes('line'));
  const shiftTables = allTables.filter(t => t.name.toLowerCase().includes('shift'));

  console.log('  包含"scope"的表:', scopeTables.map(t => t.name));
  console.log('  包含"line"的表:', lineTables.map(t => t.name));
  console.log('  包含"shift"的表:', shiftTables.map(t => t.name));

  // 2. 检查ShiftLine表
  console.log('\n2️⃣ ShiftLine表:');

  try {
    const shiftLineCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "ShiftLine"
    `;
    console.log(`  总记录数: ${shiftLineCount[0].count}`);

    const shiftLineColumns = await prisma.$queryRaw`
      PRAGMA table_info("ShiftLine")
    `;
    console.log('\n  字段:');
    shiftLineColumns.forEach((col) => {
      console.log(`    ${col.name}: ${col.type}`);
    });

    if (shiftLineCount[0].count > 0) {
      const shiftLines = await prisma.$queryRaw`
        SELECT * FROM "ShiftLine" LIMIT 3
      `;
      console.log('\n  示例数据（前3条）:');
      shiftLines.forEach((line, idx) => {
        console.log(`    ${idx + 1}. ${JSON.stringify(line)}`);
      });
    }
  } catch (e) {
    console.log(`  ❌ 查询失败: ${e.message}`);
  }

  // 3. 检查SystemConfig中的WH参数
  console.log('\n3️⃣ SystemConfig参数:');

  const allConfigs = await prisma.systemConfig.findMany({
    orderBy: { configKey: 'asc' },
  });

  console.log(`  总参数数: ${allConfigs.length}`);

  const whConfigs = allConfigs.filter(c => c.configKey.startsWith('WH'));
  if (whConfigs.length > 0) {
    console.log('\n  WH开头的参数:');
    whConfigs.forEach((c) => {
      console.log(`    ${c.configKey}: ${c.configValue}`);
      console.log(`      描述: ${c.description || '无'}`);
      console.log(`      分类: ${c.category || '无'}`);
    });
  } else {
    console.log('  ❌ 未找到WH开头的参数');
    console.log('\n  所有参数（前10个）:');
    allConfigs.slice(0, 10).forEach((c) => {
      console.log(`    ${c.configKey}: ${c.configValue} (${c.category || '无分类'})`);
    });
  }

  // 4. 查看分摊规则5的完整配置
  console.log('\n4️⃣ 分摊规则5的完整配置:');

  const rule = await prisma.allocationRuleConfig.findUnique({
    where: { id: 5 },
  });

  if (rule) {
    console.log('  所有字段和值:');
    Object.entries(rule).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'createdAt' && key !== 'updatedAt') {
        const displayValue = typeof value === 'object'
          ? JSON.stringify(value).substring(0, 100)
          : String(value);
        console.log(`    ${key}: ${displayValue}`);
      }
    });
  }

  // 5. 检查是否有分摊范围相关的表
  console.log('\n5️⃣ 查找分摊范围相关表:');

  const possibleScopeTables = [
    'AllocationScope',
    'AllocationScopeConfig',
    'Scope',
    'RuleScope',
  ];

  for (const tableName of possibleScopeTables) {
    try {
      const count = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "${tableName}"
      `;
      console.log(`  ✅ ${tableName}: ${count[0].count}条记录`);

      const sample = await prisma.$queryRaw`
        SELECT * FROM "${tableName}" LIMIT 1
      `;
      console.log(`    示例: ${JSON.stringify(sample[0]).substring(0, 200)}`);
    } catch (e) {
      // 表不存在，跳过
    }
  }

  await prisma.$disconnect();
}

checkScopeAndLine().catch(console.error);
