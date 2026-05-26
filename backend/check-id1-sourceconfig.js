const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkId1SourceConfig() {
  console.log('🔍 查看ID=1配置的sourceConfig（作为参考）\n');
  console.log('═'.repeat(80));

  const configRaw = await prisma.$queryRaw`
    SELECT id, "configName", "sourceConfig", status
    FROM "AllocationConfig"
    WHERE id = 1
  `;

  if (configRaw && configRaw.length > 0) {
    const config = configRaw[0];
    console.log('\nID=1配置:');
    console.log(`  名称: ${config.configName}`);
    console.log(`  状态: ${config.status}`);

    if (config.sourceConfig) {
      const sourceConfig = typeof config.sourceConfig === 'string'
        ? JSON.parse(config.sourceConfig)
        : config.sourceConfig;

      console.log('\n  sourceConfig内容:');
      console.log(JSON.stringify(sourceConfig, null, 2));

      console.log('\n  字段说明:');
      console.log(`    employeeFilter: ${JSON.stringify(sourceConfig.employeeFilter || '无')}`);
      console.log(`    accountFilter: ${JSON.stringify(sourceConfig.accountFilter || '无')}`);
      console.log(`    attendanceCodes: ${JSON.stringify(sourceConfig.attendanceCodes || '无')}`);
    } else {
      console.log('\n  ❌ sourceConfig也为空');
    }
  }

  await prisma.$disconnect();
}

checkId1SourceConfig().catch(console.error);
