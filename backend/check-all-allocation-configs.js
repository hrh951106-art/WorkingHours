const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllConfigs() {
  console.log('🔍 查看所有分摊配置\n');
  console.log('═'.repeat(80));

  // 1. 查询所有配置
  const allConfigs = await prisma.$queryRaw`
    SELECT id, "configName", description, "sourceConfig", status,
           "createdAt", "updatedAt"
    FROM "AllocationConfig"
    ORDER BY id ASC
  `;

  console.log(`\n1️⃣ 所有分摊配置（共${allConfigs.length}个）:\n`);

  allConfigs.forEach((config, idx) => {
    console.log(`配置${idx + 1}:`);
    console.log(`  ID: ${config.id}`);
    console.log(`  名称: ${config.configName}`);
    console.log(`  描述: ${config.description || '(无)'}`);
    console.log(`  状态: ${config.status}`);

    const sourceConfig = config.sourceConfig
      ? (typeof config.sourceConfig === 'string'
          ? JSON.parse(config.sourceConfig)
          : config.sourceConfig)
      : null;

    if (sourceConfig) {
      console.log(`  sourceConfig:`);
      console.log(`    员工筛选: ${JSON.stringify(sourceConfig.employeeFilter || '{}')}`);
      console.log(`    账户筛选: ${JSON.stringify(sourceConfig.accountFilter || '{}')}`);
      console.log(`    出勤代码: ${JSON.stringify(sourceConfig.attendanceCodes || [])}`);
    } else {
      console.log(`  sourceConfig: ❌ 空`);
    }

    console.log('');
  });

  // 2. 检查关联规则
  console.log('2️⃣ 各配置的关联规则:\n');

  for (const config of allConfigs) {
    const rules = await prisma.$queryRaw`
      SELECT id, "ruleName", "ruleType", status
      FROM "AllocationRuleConfig"
      WHERE "configId" = ${config.id}
      ORDER BY id ASC
    `;

    console.log(`配置ID=${config.id} (${config.configName}):`);

    if (rules && rules.length > 0) {
      rules.forEach((rule, idx) => {
        console.log(`  规则${idx + 1}: ID=${rule.id}, 名称=${rule.ruleName}, 类型=${rule.ruleType}, 状态=${rule.status}`);
      });
    } else {
      console.log(`  无关联规则`);
    }

    console.log('');
  }

  // 3. 检查分摊结果
  console.log('3️⃣ 各配置的分摊结果:\n');

  for (const config of allConfigs) {
    const results = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "AllocationResult"
      WHERE "configId" = ${config.id}
    `;

    const count = results[0]?.count || 0;
    console.log(`配置ID=${config.id} (${config.configName}): ${count} 条分摊结果`);
  }

  // 4. 总结
  console.log('\n4️⃣ 总结:');
  console.log('═'.repeat(80));
  console.log(`总配置数: ${allConfigs.length}`);
  console.log(`激活的配置: ${allConfigs.filter(c => c.status === 'ACTIVE').length}`);
  console.log(`有sourceConfig的配置: ${allConfigs.filter(c => c.sourceConfig).length}`);

  await prisma.$disconnect();
}

checkAllConfigs().catch(console.error);
