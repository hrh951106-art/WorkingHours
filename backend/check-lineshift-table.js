const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLineShiftTable() {
  console.log('🔍 检查LineShift（开线计划）表\n');
  console.log('═'.repeat(80));

  // 1. 查看LineShift表结构
  console.log('\n1️⃣ LineShift表结构:');

  const columns = await prisma.$queryRaw`
    PRAGMA table_info("LineShift")
  `;

  console.log('  字段列表:');
  columns.forEach((col) => {
    console.log(`    ${col.name}: ${col.type}`);
  });

  // 2. 查看数据统计
  const count = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "LineShift"
  `;

  console.log(`\n  总记录数: ${count[0].count}`);

  // 3. 查看示例数据
  if (count[0].count > 0) {
    const lines = await prisma.$queryRaw`
      SELECT * FROM "LineShift"
      LIMIT 5
    `;

    console.log('\n  示例数据（前5条）:');
    lines.forEach((line, idx) => {
      console.log(`\n  记录${idx + 1}:`);
      Object.entries(line).forEach(([key, value]) => {
        const displayValue = value !== null ? String(value).substring(0, 50) : 'null';
        console.log(`    ${key}: ${displayValue}`);
      });
    });
  }

  // 4. 检查是否有allocationScopeId=5的配置
  console.log('\n2️⃣ 查找分摊范围ID=5的配置:');

  // 查看所有表，找找可能的分摊范围表
  const allTables = await prisma.$queryRaw`
    SELECT name FROM "sqlite_schema"
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `;

  const scopeRelatedTables = allTables
    .map(t => t.name)
    .filter(name => name.includes('Scope') || name.includes('scope'));

  console.log('  可能的分摊范围表:', scopeRelatedTables);

  // 检查每个表
  for (const tableName of scopeRelatedTables) {
    try {
      const tableCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "${tableName}"
      `;
      console.log(`\n  ${tableName}: ${tableCount[0].count}条记录`);

      if (tableCount[0].count > 0 && tableCount[0].count < 100) {
        const records = await prisma.$queryRaw`
          SELECT * FROM "${tableName}" LIMIT 3
        `;
        console.log('  示例数据:');
        records.forEach((r) => {
          console.log(`    ${JSON.stringify(r).substring(0, 200)}`);
        });
      }
    } catch (e) {
      // 跳过
    }
  }

  // 5. 检查productionLineHierarchyLevel参数
  console.log('\n3️⃣ SystemConfig中的产线层级参数:');

  const lineLevelConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'productionLineHierarchyLevel' },
  });

  if (lineLevelConfig) {
    console.log(`  productionLineHierarchyLevel: ${lineLevelConfig.configValue}`);
    console.log(`  描述: ${lineLevelConfig.description || '无'}`);
    console.log(`  这表示产线在accountName中的层级位置（例如：6表示第6层是产线）`);
  }

  // 6. 总结
  console.log('\n4️⃣ 总结:');

  console.log('  基于以上检查，理解用户需求如下:');
  console.log('  1. 分摊目标不再是固定配置');
  console.log('  2. 改为从LineShift表动态获取');
  console.log('  3. 获取逻辑:');
  console.log('     a) 从待分摊工时的accountName中，根据分摊范围层级提取值');
  console.log('     b) 用这个值去LineShift表查询匹配的线体');
  console.log('     c) 条件：同一天、同一班次、配置为"参与分摊"');
  console.log('     d) 从查询结果中提取产线accountName（根据productionLineHierarchyLevel层级）');

  await prisma.$disconnect();
}

checkLineShiftTable().catch(console.error);
