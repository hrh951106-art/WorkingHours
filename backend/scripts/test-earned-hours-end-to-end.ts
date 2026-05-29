import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('端到端测试：挣得工时计算 - 标准工时匹配');
  console.log('========================================\n');

  // 1. 检查配置
  console.log('步骤1: 检查系统配置');
  console.log('========================================');

  const hierarchyConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'standardHoursHierarchyLevels' },
  });

  console.log('踢除层级配置:', hierarchyConfig?.configValue || '(未配置)');
  console.log('');

  // 2. 查看产品标准配置
  console.log('步骤2: 查看产品标准工时配置');
  console.log('========================================');

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
      effectiveDate: true,
      expiryDate: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`找到 ${standardConfigs.length} 条标准配置:`);
  standardConfigs.forEach((config) => {
    const effective = config.effectiveDate.toISOString().substring(0, 10);
    const expiry = config.expiryDate ? config.expiryDate.toISOString().substring(0, 10) : '永久';
    const qtyInfo = config.quantity ? ` / ${config.quantity}件` : '每件';
    const pathInfo = config.accountPath ? `"${config.accountPath}"` : '(未配置层级)';
    console.log(`  [${config.id}] ${config.productName}`);
    console.log(`      accountLevel: ${config.accountLevel}, accountPath: ${pathInfo}`);
    console.log(`      standardHours: ${config.standardHours}${qtyInfo}`);
    console.log(`      有效期: ${effective} ~ ${expiry}`);
  });

  // 3. 查看劳动力账户
  console.log('');
  console.log('步骤3: 查看劳动力账户示例');
  console.log('========================================');

  const laborAccounts = await prisma.laborAccount.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      code: true,
      name: true,
      namePath: true,
      level: true,
    },
    take: 5,
  });

  console.log('前 5 个劳动力账户:');
  laborAccounts.forEach((account) => {
    console.log(`  [${account.id}] ${account.name} (${account.code})`);
    console.log(`      namePath: ${account.namePath || '(空)'}`);
    console.log(`      level: ${account.level}`);
  });

  // 4. 模拟匹配逻辑
  console.log('');
  console.log('步骤4: 模拟标准工时匹配');
  console.log('========================================');

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

    return pathParts.filter(p => p.trim()).join('/');
  };

  const testCases = [
    { namePath: '///大桶/焊接', description: '产品层+工序层' },
    { namePath: '//焊接', description: '工序层' },
    { namePath: '///大桶', description: '产品层' },
  ];

  const hierarchyLevels = hierarchyConfig?.configValue || '';

  testCases.forEach((testCase) => {
    const matchPath = generateMatchPath(testCase.namePath, hierarchyLevels);
    console.log(`  ${testCase.description}: "${testCase.namePath}"`);
    console.log(`    -> 匹配路径: "${matchPath || '(空)'}"`);

    // 查找匹配的标准配置
    const matchedConfigs = standardConfigs.filter((config) => {
      return config.accountPath === matchPath || (!config.accountPath && !matchPath);
    });

    if (matchedConfigs.length > 0) {
      console.log(`    ✓ 匹配到 ${matchedConfigs.length} 条标准配置`);
      matchedConfigs.forEach((config) => {
        const qtyInfo = config.quantity ? `/ ${config.quantity}件` : '每件';
        console.log(`      - ID ${config.id}: ${config.standardHours}${qtyInfo}`);
      });
    } else {
      console.log(`    ✗ 未找到匹配的标准配置`);
    }
    console.log('');
  });

  // 5. 总结和建议
  console.log('步骤5: 总结和建议');
  console.log('========================================');
  console.log('当前配置:');
  console.log('  - 踢除层级: ' + (hierarchyConfig?.configValue || '(未配置)'));
  console.log('  - 标准配置数量: ' + standardConfigs.length);
  console.log('');

  const hasEmptyPathConfig = standardConfigs.some(c => !c.accountPath);
  if (!hasEmptyPathConfig) {
    console.log('⚠️  建议：');
    console.log('  当前所有标准配置都配置了 accountPath，建议添加一条 accountPath 为空的');
    console.log('  通用标准配置，作为默认标准（当无法匹配具体层级时使用）。');
    console.log('');
    console.log('  例如：');
    console.log('    INSERT INTO ProductStandardHourByLevel');
    console.log('    (productId, productName, accountLevel, accountPath, standardHours, quantity, effectiveDate, status, createdById, createdByName)');
    console.log('    VALUES');
    console.log("    (15, '大桶', NULL, NULL, 1.0, 100, datetime('now'), 'ACTIVE', 1, '系统');");
  } else {
    console.log('✓ 系统配置完善，包含通用标准配置。');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});
