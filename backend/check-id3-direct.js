const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkId3Direct() {
  console.log('🔍 直接查询ID=3的原始数据\n');
  console.log('═'.repeat(80));

  // 1. 直接使用Prisma查询
  console.log('\n1️⃣ 使用Prisma查询:');
  const config1 = await prisma.allocationConfig.findUnique({
    where: { id: 3 },
  });

  console.log('  Prisma查询结果:');
  console.log(`    id: ${config1?.id}`);
  console.log(`    configName: ${config1?.configName}`);
  console.log(`    sourceConfig类型: ${typeof config1?.sourceConfig}`);
  console.log(`    sourceConfig值: ${JSON.stringify(config1?.sourceConfig, null, 2)}`);

  // 2. 使用原始SQL查询
  console.log('\n2️⃣ 使用原始SQL查询:');
  const config2 = await prisma.$queryRaw`
    SELECT id, "configName", "sourceConfig", status
    FROM "AllocationConfig"
    WHERE id = 3
  `;

  if (config2 && config2.length > 0) {
    console.log('  SQL查询结果:');
    console.log(`    id: ${config2[0].id}`);
    console.log(`    configName: ${config2[0].configName}`);
    console.log(`    sourceConfig类型: ${typeof config2[0].sourceConfig}`);
    console.log(`    sourceConfig值: ${JSON.stringify(config2[0].sourceConfig, null, 2)}`);
  }

  // 3. 检查字段是否是JSONB类型
  console.log('\n3️⃣ 检查表结构:');
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'AllocationConfig'
    AND column_name = 'sourceConfig'
  `;

  console.log('  字段信息:');
  console.log(`    ${JSON.stringify(columns, null, 2)}`);

  // 4. 测试JSON解析
  console.log('\n4️⃣ 测试sourceConfig解析:');
  if (config2 && config2.length > 0 && config2[0].sourceConfig) {
    const sourceConfig = config2[0].sourceConfig;
    console.log(`  原始值: ${sourceConfig}`);

    try {
      if (typeof sourceConfig === 'string') {
        const parsed = JSON.parse(sourceConfig);
        console.log(`  解析成功（JSON字符串）:`);
        console.log(`    ${JSON.stringify(parsed, null, 2)}`);
      } else {
        console.log(`  已经是对象，直接输出:`);
        console.log(`    ${JSON.stringify(sourceConfig, null, 2)}`);
      }
    } catch (e) {
      console.log(`  ❌ 解析失败: ${e.message}`);
    }
  } else {
    console.log('  ❌ sourceConfig为null或undefined');
  }

  // 5. 查看所有可能的字段名
  console.log('\n5️⃣ AllocationConfig表的所有字段:');
  const allColumns = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'AllocationConfig'
    ORDER BY ordinal_position
  `;

  console.log('  字段列表:');
  allColumns.forEach((col) => {
    console.log(`    ${col.column_name}: ${col.data_type}`);
  });

  await prisma.$disconnect();
}

checkId3Direct().catch(console.error);
