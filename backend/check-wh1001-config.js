const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWH1001Config() {
  console.log('🔍 检查SystemConfig中的WH1001参数\n');
  console.log('═'.repeat(80));

  // 1. 查询所有SystemConfig参数
  console.log('\n1️⃣ 所有SystemConfig参数:');

  const allConfigs = await prisma.systemConfig.findMany({
    orderBy: {
      configKey: 'asc',
    },
  });

  console.log(`  总共 ${allConfigs.length} 个参数\n`);

  // 按分类显示
  const allocationConfigs = allConfigs.filter(c => c.category === 'ALLOCATION');
  const workHoursConfigs = allConfigs.filter(c => c.category === 'WORK_HOURS');

  console.log('  【ALLOCATION分类】(分摊相关):');
  allocationConfigs.forEach((c) => {
    console.log(`    ${c.configKey}: ${c.configValue}`);
    console.log(`      描述: ${c.description || '(无)'}`);
  });

  console.log('\n  【WORK_HOURS分类】(工时相关):');
  workHoursConfigs.forEach((c) => {
    console.log(`    ${c.configKey}: ${c.configValue}`);
    console.log(`      描述: ${c.description || '(无)'}`);
  });

  // 2. 检查是否有WH开头的参数
  console.log('\n2️⃣ 查找WH开头的参数:');

  const whConfigs = allConfigs.filter(c => c.configKey.startsWith('WH'));

  if (whConfigs.length > 0) {
    console.log(`  找到 ${whConfigs.length} 个WH参数:`);
    whConfigs.forEach((c) => {
      console.log(`    ${c.configKey}: ${c.configValue}`);
      console.log(`      描述: ${c.description || '(无)'}`);
      console.log(`      分类: ${c.category || '(无)'}`);
    });
  } else {
    console.log('  ❌ 未找到WH开头的���数');
    console.log('\n  可能的对应关系:');
    console.log('    WH1001 可能对应 productionLineHierarchyLevel');
    console.log('    当前值: productionLineHierarchyLevel = 6');
    console.log('    描述: 产线对应层级');
  }

  // 3. 检查productionLineHierarchyLevel的详细信息
  console.log('\n3️⃣ productionLineHierarchyLevel详细信息:');

  const lineLevelConfig = allConfigs.find(c => c.configKey === 'productionLineHierarchyLevel');

  if (lineLevelConfig) {
    console.log(`  configKey: ${lineLevelConfig.configKey}`);
    console.log(`  configValue: ${lineLevelConfig.configValue}`);
    console.log(`  描述: ${lineLevelConfig.description || '(无描述)'}`);
    console.log(`  分类: ${lineLevelConfig.category || '(无分类)'}`);
    console.log(`  创建时间: ${lineLevelConfig.createdAt}`);
    console.log(`  更新时间: ${lineLevelConfig.updatedAt}`);
  }

  // 4. 查看数据库中的所有分类
  console.log('\n4️⃣ SystemConfig中的所有分类:');

  const categories = [...new Set(allConfigs.map(c => c.category).filter(c => c))];
  console.log(`  分类列表: ${categories.join(', ')}`);

  // 5. 建议
  console.log('\n5️⃣ 建议:');
  console.log('═'.repeat(80));

  if (!whConfigs.find(c => c.configKey === 'WH1001')) {
    console.log('  ❌ SystemConfig中没有WH1001参数');
    console.log('\n  可能的情况:');
    console.log('    1. WH1001参数还没有创建');
    console.log('    2. WH1001对应的就是productionLineHierarchyLevel');
    console.log('    3. 前端页面显示的WH1001是productionLineHierarchyLevel的别名');
    console.log('\n  解决方案:');
    console.log('    【方案A】新增WH1001参数');
    console.log('      - 在SystemConfig表中新增WH1001参数');
    console.log('      - configValue = 6 (与productionLineHierarchyLevel相同)');
    console.log('      - description = "产线层级(WH1001)"');
    console.log('    ');
    console.log('    【方案B】使用现有参数');
    console.log('      - 直接使用productionLineHierarchyLevel参数');
    console.log('      - 在分摊逻辑中读取这个参数');
    console.log('    ');
    console.log('    【方案C】前端使用别名');
    console.log('      - 前端页面显示WH1001');
    console.log('      - 后台实际读写productionLineHierarchyLevel');
  }

  await prisma.$disconnect();
}

checkWH1001Config().catch(console.error);
