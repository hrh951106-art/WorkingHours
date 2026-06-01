import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHierarchyMapping() {
  // 查询层级配置
  const configs = await prisma.accountHierarchyConfig.findMany({
    orderBy: { id: 'asc' },
  });

  if (configs.length === 0) {
    console.log('未找到层级配置');
    await prisma.$disconnect();
    return;
  }

  const configId = configs[0].id;

  const levels = await prisma.accountHierarchyLevelDetail.findMany({
    where: { configId },
    orderBy: { level: 'asc' },
  });

  console.log('=== 劳动力账户层级配置 ===\n');
  levels.forEach((level) => {
    console.log(`Level ${level.level}: ${level.levelName}`);
    console.log(`  ID: ${level.id}`);
    console.log(`  levelCode: ${level.levelCode || 'NULL'}`);
    console.log(`  mappingType: ${level.mappingType || 'NULL'}`);
    console.log(`  mappingValue: ${level.mappingValue || 'NULL'}`);
    console.log('');
  });

  // 重点查看Level 6（岗位）和Level 7（技能等级）
  console.log('=== 岗位和技能等级映射配置 ===\n');
  const level6 = levels.find(l => l.level === 6);
  const level7 = levels.find(l => l.level === 7);

  if (level6) {
    console.log(`Level 6 (岗位):`);
    console.log(`  mappingType: ${level6.mappingType || '未配置'}`);
    console.log(`  mappingValue: ${level6.mappingValue || '未配置'}`);
    console.log('');
  }

  if (level7) {
    console.log(`Level 7 (技能等级):`);
    console.log(`  mappingType: ${level7.mappingType || '未配置'}`);
    console.log(`  mappingValue: ${level7.mappingValue || '未配置'}`);
    console.log('');
  }

  console.log('分析：');
  if (level6?.mappingType === 'FIELD' && level6.mappingValue) {
    console.log(`  岗位从员工字段 "${level6.mappingValue}" 获取`);
  } else if (level6?.mappingType === 'WORK_INFO' && level6.mappingValue) {
    console.log(`  岗位从WorkInfoHistory字段 "${level6.mappingValue}" 获取`);
  } else {
    console.log('  岗位未配置或使用默认值');
  }

  if (level7?.mappingType === 'FIELD' && level7.mappingValue) {
    console.log(`  技能等级从员工字段 "${level7.mappingValue}" 获取`);
  } else if (level7?.mappingType === 'WORK_INFO' && level7.mappingValue) {
    console.log(`  技能等级从WorkInfoHistory字段 "${level7.mappingValue}" 获取`);
  } else {
    console.log('  技能等级未配置或使用默认值');
  }

  await prisma.$disconnect();
}

checkHierarchyMapping();
