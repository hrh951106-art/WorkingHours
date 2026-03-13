import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查账户层级配置 ===\n');

  // 1. 查找账户145
  const account145 = await prisma.laborAccount.findUnique({
    where: { id: 145 },
  });

  if (!account145) {
    console.log('未找到账户145');
    return;
  }

  console.log('账户145当前信息:');
  console.log(`  ID: ${account145.id}`);
  console.log(`  编码: ${account145.code}`);
  console.log(`  名称: ${account145.name}`);
  console.log(`  名称路径: ${account145.namePath}`);
  console.log(`  路径: ${account145.path}`);
  console.log(`  层级: ${account145.level}`);
  console.log(`  父账户ID: ${account145.parentId}`);

  // 2. 解析层级值
  const hierarchyValues = JSON.parse(account145.hierarchyValues || '[]');
  console.log('\n层级值配置:');
  hierarchyValues.forEach((hv: any) => {
    console.log(`  Level ${hv.level} - ${hv.name}:`);
    console.log(`    - mappingType: ${hv.mappingType}`);
    console.log(`    - mappingValue: ${hv.mappingValue}`);
    console.log(`    - selectedValue: ${JSON.stringify(hv.selectedValue)}`);
  });

  // 3. 查找车间层级配置
  console.log('\n=== 检查车间层级配置 ===');
  const workshopLevel = hierarchyValues.find((hv: any) => hv.level === 2 && hv.name === '车间');
  if (workshopLevel) {
    console.log('车间层级配置:');
    console.log(`  - selectedValue: ${JSON.stringify(workshopLevel.selectedValue)}`);

    if (!workshopLevel.selectedValue) {
      console.log('\n⚠️  车间层级没有配置值！');
      console.log('需要查找W1总装车间的正确ID');
    } else if (workshopLevel.selectedValue.name !== 'W1总装车间') {
      console.log(`\n⚠️  车间名称不匹配: ${workshopLevel.selectedValue.name}`);
      console.log('应该改为: W1总装车间');
    }
  }

  // 4. 查找W1总装车间的ID
  console.log('\n=== 查找W1总装车间 ===');
  const w1Workshop = await prisma.organization.findFirst({
    where: {
      name: { contains: 'W1总装车间' },
      type: 'DEPARTMENT',
    },
  });

  if (w1Workshop) {
    console.log('找到W1总装车间:');
    console.log(`  ID: ${w1Workshop.id}`);
    console.log(`  名称: ${w1Workshop.name}`);
    console.log(`  编码: ${w1Workshop.code}`);
    console.log(`  类型: ${w1Workshop.type}`);
  } else {
    console.log('未找到W1总装车间组织');

    // 模糊搜索
    const allDepts = await prisma.organization.findMany({
      where: {
        type: 'DEPARTMENT',
        name: { contains: 'W1' },
      },
    });
    console.log('\n包含"W1"的车间组织:');
    allDepts.forEach(dept => {
      console.log(`  - ${dept.name} (ID: ${dept.id}, Code: ${dept.code})`);
    });
  }

  // 5. 检查账户层级配置表
  console.log('\n=== 检查账户层级配置表 ===');
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    orderBy: { level: 'asc' },
  });

  console.log('层级配置:');
  hierarchyConfigs.forEach(config => {
    console.log(`  Level ${config.level} - ${config.name}`);
    console.log(`    - mappingType: ${config.mappingType}`);
    console.log(`    - dataSourceId: ${config.dataSourceId}`);
  });
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
