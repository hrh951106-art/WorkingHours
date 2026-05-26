const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLinePlanStructure() {
  console.log('🔍 检查开线计划表和SystemConfig配置\n');
  console.log('═'.repeat(80));

  // 1. 检查开线计划表（假设表名是LinePlan或类似）
  console.log('\n1️⃣ 查找开线计划表:');
  const tables = await prisma.$queryRaw`
    SELECT name
    FROM "sqlite_schema"
    WHERE type = 'table'
    AND name LIKE '%line%'
    OR name LIKE '%plan%'
    ORDER BY name
  `;

  console.log('  相关表:');
  tables.forEach((t) => {
    console.log(`    - ${t.name}`);
  });

  // 2. 检查SystemConfig中的WH1001参数
  console.log('\n2️⃣ SystemConfig.WH1001参数:');

  const wh1001 = await prisma.systemConfig.findUnique({
    where: { configKey: 'WH1001' },
  });

  if (wh1001) {
    console.log(`  configKey: ${wh1001.configKey}`);
    console.log(`  configValue: ${wh1001.configValue}`);
    console.log(`  描述: ${wh1001.description || '(无)'}`);
  } else {
    console.log('  ❌ 未找到WH1001参数');
  }

  // 3. 查看所有SystemConfig参数
  console.log('\n3️⃣ 所有SystemConfig参数（WH开头的）:');

  const whConfigs = await prisma.systemConfig.findMany({
    where: {
      configKey: {
        startsWith: 'WH',
      },
    },
    orderBy: {
      configKey: 'asc',
    },
  });

  whConfigs.forEach((c) => {
    console.log(`  ${c.configKey}: ${c.configValue} (${c.description || '无描述'})`);
  });

  // 4. 检查分摊规则表结构
  console.log('\n4️⃣ AllocationRuleConfig表结构:');

  const rule = await prisma.allocationRuleConfig.findFirst({
    where: { id: 5 },
  });

  if (rule) {
    console.log(`  规则ID: ${rule.id}`);
    console.log(`  规则名称: ${rule.ruleName}`);
    console.log(`  allocationBasis: ${rule.allocationBasis}`);
    console.log(`  所有字段:`);

    Object.keys(rule).forEach((key) => {
      if (key !== 'id' && key !== 'ruleName') {
        const value = rule[key];
        if (value !== null && value !== undefined) {
          const displayValue = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 50);
          console.log(`    ${key}: ${displayValue}`);
        }
      }
    });

    // 检查是否有"分摊范围"相关字段
    console.log('\n  检查可能的"分摊范围"字段:');

    if (rule.allocationScopeLevel) {
      console.log(`    allocationScopeLevel: ${rule.allocationScopeLevel}`);
    }
    if (rule.allocationScope) {
      console.log(`    allocationScope: ${rule.allocationScope}`);
    }
    if (rule.scopeConfig) {
      console.log(`    scopeConfig: ${rule.scopeConfig}`);
    }
  }

  // 5. 尝试查找"开线计划"相关的表
  console.log('\n5️⃣ 查找开线计划表:');

  const possibleTables = [
    'LinePlan',
    'LineOpeningPlan',
    'ProductionLinePlan',
    'WorkLinePlan',
    'ShiftLinePlan',
  ];

  for (const tableName of possibleTables) {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "${tableName}"
      `;
      console.log(`  ✅ ${tableName}: ${result[0].count}条记录`);

      // 查看表结构
      const columns = await prisma.$queryRaw`
        PRAGMA table_info("${tableName}")
      `;

      console.log(`    字段:`);
      columns.forEach((col) => {
        console.log(`      ${col.name}: ${col.type}`);
      });

      break;
    } catch (e) {
      console.log(`  ❌ ${tableName}: 不存在`);
    }
  }

  await prisma.$disconnect();
}

checkLinePlanStructure().catch(console.error);
