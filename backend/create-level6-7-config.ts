import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createLevel6And7() {
  console.log('=== 创建Level 6-7层级配置 ===\n');

  // 创建Level 6: 岗位
  const level6 = await prisma.accountHierarchyConfig.create({
    data: {
      code: `HIER_POST_${Date.now()}`,
      name: '岗位',
      description: '员工岗位层级',
      level: 6,
      mappingType: 'FIELD_position',
      mappingValue: 'position',
      sort: 6,
      status: 'ACTIVE',
    },
  });

  console.log('✅ 创建Level 6 (岗位):');
  console.log(`  ID: ${level6.id}`);
  console.log(`  mappingType: ${level6.mappingType}`);
  console.log(`  mappingValue: ${level6.mappingValue}`);

  // 创建Level 7: 技能等级
  const level7 = await prisma.accountHierarchyConfig.create({
    data: {
      code: `HIER_LEVEL_${Date.now()}`,
      name: '技能等级',
      description: '员工技能等级层级',
      level: 7,
      mappingType: 'FIELD_jobLevel',
      mappingValue: 'jobLevel',
      sort: 7,
      status: 'ACTIVE',
    },
  });

  console.log('\n✅ 创建Level 7 (技能等级):');
  console.log(`  ID: ${level7.id}`);
  console.log(`  mappingType: ${level7.mappingType}`);
  console.log(`  mappingValue: ${level7.mappingValue}`);

  console.log('\n配置说明：');
  console.log('  - Level 6从WorkInfoHistory.position字段获取岗位信息');
  console.log('  - Level 7从WorkInfoHistory.jobLevel字段获取技能等级信息');

  await prisma.$disconnect();
}

createLevel6And7()
  .then(() => {
    console.log('\n创建完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('创建失败:', error);
    process.exit(1);
  });
