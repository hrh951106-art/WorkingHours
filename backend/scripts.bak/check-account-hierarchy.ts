import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查账户层级信息 ===\n');

  // 检查账户ID 145（有I05记录的账户）
  const account145 = await prisma.laborAccount.findUnique({
    where: { id: 145 },
  });

  console.log('账户145 (有I05记录):');
  console.log(`  名称: ${account145?.name}`);
  console.log(`  编码: ${account145?.code}`);
  console.log(`  组织ID: ${account145?.orgId}`);
  console.log(`  父账户ID: ${account145?.parentId}`);

  // 获取G02配置的筛选条件
  console.log('\nG02配置的账户筛选条件:');
  console.log('  工厂ID: 5 (富阳工厂)');
  console.log('  设备类型: A02');

  // 检查层级配置
  console.log('\n当前层级配置:');
  const levels = await prisma.accountHierarchyLevel.findMany({
    orderBy: { level: 'asc' },
  });

  for (const level of levels) {
    console.log(`  ${level.levelName} (Level ${level.level})`);
  }

  // 检查工厂层级的信息
  console.log('\n检查工厂层级 (Level 1):');
  const factoryLevel = await prisma.accountHierarchyLevel.findFirst({
    where: { level: 1 },
  });

  if (factoryLevel) {
    const factoryValues = await prisma.hierarchyValue.findMany({
      where: {
        levelId: factoryLevel.id,
        valueId: 5,
      },
    });
    console.log('  工厂ID=5的值:', factoryValues);
  }

  // 检查设备类型层级
  console.log('\n检查设备类型层级 (Level 7):');
  const equipmentTypeLevel = await prisma.accountHierarchyLevel.findFirst({
    where: { level: 7 },
  });

  if (equipmentTypeLevel) {
    const equipmentTypeValues = await prisma.hierarchyValue.findMany({
      where: {
        levelId: equipmentTypeLevel.id,
        valueId: 'A02',
      },
    });
    console.log('  设备类型A02的值:', equipmentTypeValues);
  }

  // 检查账户145的层级路径
  console.log('\n账户145的完整层级路径:');
  const accountPath = await prisma.$queryRaw`
    WITH RECURSIVE account_tree AS (
      SELECT
        id, name, code, parent_id, 0 as depth,
        ARRAY[id] as path_ids,
        ARRAY[name] as path_names
      FROM "LaborAccount"
      WHERE id = 145
      UNION ALL
      SELECT
        a.id, a.name, a.code, a.parent_id, at.depth + 1,
        at.path_ids || a.id,
        at.path_names || a.name
      FROM "LaborAccount" a
      INNER JOIN account_tree at ON a.id = at.parent_id
    )
    SELECT * FROM account_tree ORDER BY depth DESC
  `;

  console.log(accountPath);

  // 检查账户145在层级中的值
  console.log('\n账户145在各层级的值:');
  const account145Values = await prisma.accountHierarchyValue.findMany({
    where: { accountId: 145 },
    include: {
      level: true,
      value: true,
    },
  });

  if (account145Values.length === 0) {
    console.log('  ⚠️  账户145没有在任何层级中配置值！');
    console.log('  这就是为什么G02配置找不到它的原因！');
    console.log('\n解决方案:');
    console.log('  1. 为账户145配置层级值（工厂=5, 设备类型=A02）');
    console.log('  2. 或者修改G02配置，去掉过于严格的筛选条件');
  } else {
    console.log('  找到以下层级值:');
    account145Values.forEach(v => {
      console.log(`    - ${v.level.levelName}: ${v.value?.value || v.valueId}`);
    });
  }
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
