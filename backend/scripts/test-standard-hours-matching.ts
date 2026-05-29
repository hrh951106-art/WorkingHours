import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('测试标准工时匹配逻辑');
  console.log('========================================\n');

  // 测试场景1：劳动力账户路径为 "///大桶/焊接"，踢除层级为 "产品,工序"
  const testOrgName1 = '///大桶/焊接';
  const testHierarchyLevels = '产品,工序';

  console.log('测试场景1:');
  console.log('  劳动力账户路径:', testOrgName1);
  console.log('  踢除层级配置:', testHierarchyLevels);

  // 模拟 generateMatchPath 逻辑
  const generateMatchPath = (namePath: string, hierarchyLevelsToRemove: string): string => {
    if (!namePath || !hierarchyLevelsToRemove) {
      return namePath || '';
    }

    const levelsToRemove = hierarchyLevelsToRemove.split(',').map(l => l.trim());
    const levelMap: Record<string, number> = {
      '工厂': 1,
      '车间': 2,
      '产线': 3,
      '产品': 4,
      '工序': 5,
    };

    const levelsToRemoveNumbers = levelsToRemove.map(l => {
      const num = parseInt(l);
      return isNaN(num) ? (levelMap[l] || 0) : num;
    }).filter(n => n > 0).sort((a, b) => b - a);

    const pathParts = namePath.split('/');

    for (const levelNum of levelsToRemoveNumbers) {
      const indexToRemove = levelNum - 1;
      if (indexToRemove >= 0 && indexToRemove < pathParts.length) {
        pathParts[indexToRemove] = '';
      }
    }

    const matchPath = pathParts.filter(p => p.trim()).join('/');
    return matchPath;
  };

  const matchPath1 = generateMatchPath(testOrgName1, testHierarchyLevels);
  console.log('  生成的匹配路径:', matchPath1);
  console.log('');

  // 测试场景2：查询数据库中的标准配置
  console.log('测试场景2: 查询数据库中的标准配置');
  const standardConfigs = await prisma.productStandardHourByLevel.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      productId: true,
      productName: true,
      accountLevel: true,
      accountPath: true,
      standardHours: true,
      quantity: true,
    },
  });

  console.log('找到 ' + standardConfigs.length + ' 条标准配置:');
  standardConfigs.forEach((config) => {
    const qtyInfo = config.quantity ? ' / ' + config.quantity + '件' : '每件';
    console.log('  - ' + config.productName);
    console.log('    accountLevel: ' + config.accountLevel);
    console.log('    accountPath: ' + config.accountPath);
    console.log('    standardHours: ' + config.standardHours + qtyInfo);
  });

  // 测试场景3：检查匹配
  console.log('');
  console.log('测试场景3: 检查路径匹配');
  standardConfigs.forEach((config) => {
    const isMatch = config.accountPath === matchPath1 || !config.accountPath;
    const matchType = !config.accountPath ? '(未配置层级)' : '(配置路径: ' + config.accountPath + ')';
    const status = isMatch ? '✓ 匹配' : '✗ 不匹配';
    console.log('  - ' + config.productName + ' ' + matchType + ' ' + status);
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});
