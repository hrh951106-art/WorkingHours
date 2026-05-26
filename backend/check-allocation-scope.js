const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllocationScope() {
  console.log('🔍 检查分摊范围和产线相关表\n');
  console.log('═'.repeat(80));

  // 1. 检查ProductionLine表
  console.log('\n1️⃣ ProductionLine表结���和数据:');

  const lineCount = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "ProductionLine"
  `;

  console.log(`  总记录数: ${lineCount[0].count}`);

  // 查看表结构
  const columns = await prisma.$queryRaw`
    PRAGMA table_info("ProductionLine")
  `;

  console.log('\n  字段列表:');
  columns.forEach((col) => {
    console.log(`    ${col.name}: ${col.type}`);
  });

  // 查看几条示例数据
  const lines = await prisma.$queryRaw`
    SELECT *
    FROM "ProductionLine"
    LIMIT 5
  `;

  console.log('\n  示例数据（前5条）:');
  lines.forEach((line, idx) => {
    console.log(`    ${idx + 1}. ${JSON.stringify(line)}`);
  });

  // 2. 检查allocationScopeId=5对应的配置
  console.log('\n2️⃣ allocationScopeId=5的配置:');

  const scopeConfigs = await prisma.$queryRaw`
    SELECT * FROM "AllocationScopeConfig"
    WHERE id = 5
  `;

  if (scopeConfigs && scopeConfigs.length > 0) {
    const scope = scopeConfigs[0];
    console.log(`  ID: ${scope.id}`);
    console.log(`  名称: ${scope.name}`);
    console.log(`  类型: ${scope.type}`);
    console.log(`  配置: ${JSON.stringify(scope)}`);
  } else {
    console.log('  ❌ 未找到allocationScopeId=5的配置');
  }

  // 查看所有AllocationScopeConfig
  console.log('\n  所有AllocationScopeConfig:');

  const allScopes = await prisma.$queryRaw`
    SELECT id, name, type
    FROM "AllocationScopeConfig"
    ORDER BY id ASC
  `;

  allScopes.forEach((s) => {
    console.log(`    ID=${s.id}, name="${s.name}", type="${s.type}"`);
  });

  // 3. 检查ShiftLine表
  console.log('\n3️⃣ ShiftLine表结构:');

  try {
    const shiftLineColumns = await prisma.$queryRaw`
      PRAGMA table_info("ShiftLine")
    `;

    console.log('  字段列表:');
    shiftLineColumns.forEach((col) => {
      console.log(`    ${col.name}: ${col.type}`);
    });

    const shiftLineCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "ShiftLine"
    `;

    console.log(`\n  总记录数: ${shiftLineCount[0].count}`);

    // 查看示例数据
    const shiftLines = await prisma.$queryRaw`
      SELECT *
      FROM "ShiftLine"
      LIMIT 3
    `;

    console.log('\n  示例数据（前3条）:');
    shiftLines.forEach((line, idx) => {
      console.log(`    ${idx + 1}. ${JSON.stringify(line)}`);
    });
  } catch (e) {
    console.log(`  ❌ 查询失败: ${e.message}`);
  }

  // 4. 检查SystemConfig中是否有WH开头的参数
  console.log('\n4️⃣ SystemConfig中的WH参数:');

  const allConfigs = await prisma.systemConfig.findMany({
    orderBy: {
      configKey: 'asc',
    },
  });

  const whConfigs = allConfigs.filter(c => c.configKey.startsWith('WH'));

  if (whConfigs.length > 0) {
    console.log(`  找到 ${whConfigs.length} 个WH参数:`);
    whConfigs.forEach((c) => {
      console.log(`    ${c.configKey}: ${c.configValue} (${c.description || '无描述'})`);
    });
  } else {
    console.log('  ❌ 未找到WH开头的参数');
    console.log('  所有SystemConfig参数:');
    allConfigs.slice(0, 10).forEach((c) => {
      console.log(`    ${c.configKey}: ${c.configValue}`);
    });
  }

  await prisma.$disconnect();
}

checkAllocationScope().catch(console.error);
