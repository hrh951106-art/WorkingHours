import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHierarchyStructure() {
  console.log('=== 检查账户层级结构 ===\n');

  // 1. 查询系统配置的所有层级
  console.log('1. 查询AccountHierarchyConfig（所有层级定义）：');
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    orderBy: { id: 'asc' },
  });

  if (hierarchyConfigs.length === 0) {
    console.log('未找到层级配置');
    return;
  }

  const configId = hierarchyConfigs[0].id;

  const hierarchyLevels = await prisma.accountHierarchyLevelDetail.findMany({
    where: { configId },
    orderBy: { level: 'asc' },
  });

  console.log(`找到 ${hierarchyLevels.length} 个层级：\n`);
  hierarchyLevels.forEach((hl) => {
    console.log(`  Level ${hl.level}: ${hl.levelName} (ID: ${hl.id}, levelId: ${hl.levelId})`);
  });

  // 2. 查询账户113的层级值
  console.log('\n2. 查询账户113的层级值：');
  const account = await prisma.laborAccount.findFirst({
    where: { id: 113 },
    select: {
      id: true,
      name: true,
      path: true,
      hierarchyValues: true,
    },
  });

  if (account) {
    console.log(`账户名称: ${account.name}`);
    console.log(`账户路径: ${account.path}\n`);

    if (account.hierarchyValues) {
      try {
        const hierarchyValues = JSON.parse(account.hierarchyValues);
        console.log('层级值详情（hierarchyValues）：');
        hierarchyValues.forEach((hv: any) => {
          console.log(`  Level ${hv.level} (${hv.name}): ${JSON.stringify(hv.selectedValue)}`);
        });
      } catch (e) {
        console.log('解析hierarchyValues失败:', e);
      }
    }
  }

  // 3. 分析账户名称的层级结构
  console.log('\n3. 分析账户名称的层级结构：');
  const orgName = '苏州工厂/生产1车间/焊接班组//电焊//';
  const pathSegments = orgName.split('/').filter(s => s.trim() !== '');

  console.log(`账户名称: "${orgName}"`);
  console.log(`分割后的段: [${pathSegments.join(', ')}]`);
  console.log(`总段数: ${pathSegments.length}\n`);

  console.log('按层级分析：');
  pathSegments.forEach((segment, index) => {
    const levelNumber = index + 1;
    console.log(`  段${index + 1}: "${segment}" -> 对应Level ${levelNumber}`);
  });

  // 4. 找出"电焊"对应的层级
  console.log('\n4. 确定"电焊"的层级：');
  const lastSegment = pathSegments[pathSegments.length - 1];
  const lastSegmentLevel = pathSegments.length;

  console.log(`  最后一个段: "${lastSegment}"`);
  console.log(`  对应层级序号: ${lastSegmentLevel}`);

  // 找到对应的层级名称
  const correspondingLevel = hierarchyLevels.find(hl => hl.level === lastSegmentLevel);
  if (correspondingLevel) {
    console.log(`  层级名称: ${correspondingLevel.name}`);
    console.log(`  层级ID (levelId): ${correspondingLevel.levelId}`);
  }

  // 5. 检查标准工时配置
  console.log('\n5. 查询产品15的标准工时配置：');
  const standardHours = await prisma.productStandardHourByLevel.findMany({
    where: {
      productId: 15,
      deletedAt: null,
      status: 'ACTIVE',
    },
  });

  console.log(`找到 ${standardHours.length} 条配置：\n`);
  standardHours.forEach((sh) => {
    console.log(`  accountPath: "${sh.accountPath || '(全局)'}"`);
    console.log(`  标准工时: ${sh.standardHours}/${sh.quantity}件`);
    console.log(`  生效日期: ${sh.effectiveDate.toISOString().substring(0,10)} ~ ${sh.expiryDate ? sh.expiryDate.toISOString().substring(0,10) : '永久'}`);
    console.log('');
  });

  // 6. 总结
  console.log('=== 总结 ===');
  console.log(`账户路径有 ${pathSegments.length} 个段`);
  console.log(`"电焊"是第 ${lastSegmentLevel} 个段，对应Level ${lastSegmentLevel} (${correspondingLevel?.name})`);
  console.log('');
  console.log('建议：');
  console.log(`  SystemConfig应该配置为: "${lastSegmentLevel}" (而不是"5")`);
  console.log(`  或者使用层级名称: "${correspondingLevel?.name}"`);
}

checkHierarchyStructure()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
