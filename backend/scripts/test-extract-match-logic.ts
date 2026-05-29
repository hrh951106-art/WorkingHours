import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('测试标准工时匹配逻辑 - 逐个匹配');
  console.log('========================================\n');

  // 模拟 extractMatchValues 逻辑
  const extractMatchValues = (namePath: string, hierarchyLevelsToExtract: string): string[] => {
    if (!namePath || !hierarchyLevelsToExtract) {
      return [];
    }

    const levelsToExtract = hierarchyLevelsToExtract.split(',').map(l => l.trim());
    const levelMap: Record<string, number> = {
      '工厂': 1,
      '车间': 2,
      '产线': 3,
      '产品': 4,
      '工序': 5,
    };

    const levelsToExtractNumbers = levelsToExtract.map(l => {
      const num = parseInt(l);
      return isNaN(num) ? (levelMap[l] || 0) : num;
    }).filter(n => n > 0).sort((a, b) => a - b);

    const pathParts = namePath.split('/');

    const extractedValues: string[] = [];
    for (const levelNum of levelsToExtractNumbers) {
      const indexToExtract = levelNum - 1;
      if (indexToExtract >= 0 && indexToExtract < pathParts.length) {
        const value = pathParts[indexToExtract];
        if (value && value.trim()) {
          extractedValues.push(value.trim());
        }
      }
    }

    return extractedValues;
  };

  // 测试用例
  const testCases = [
    {
      namePath: '///大桶/焊接',
      extractLevels: '产品,工序',
      description: '产品层+工序层'
    },
    {
      namePath: '//焊接',
      extractLevels: '产品,工序',
      description: '仅工序层（路径不完整）'
    },
    {
      namePath: '///大桶',
      extractLevels: '产品,工序',
      description: '仅产品层'
    },
    {
      namePath: '大华工厂/W1总装车间/W1总装L1产线//焊接',
      extractLevels: '产品,工序',
      description: '完整路径（工厂/车间/产线/产品/工序）'
    },
  ];

  // 查询数据库中的标准配置
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

  console.log('数据库中的标准配置:');
  console.log('========================================');
  standardConfigs.forEach((config) => {
    const pathInfo = config.accountPath ? `"${config.accountPath}"` : '(未配置层级)';
    const qtyInfo = config.quantity ? ` / ${config.quantity}件` : '每件';
    console.log(`  [${config.id}] ${config.productName}`);
    console.log(`      accountPath: ${pathInfo}, standardHours: ${config.standardHours}${qtyInfo}`);
  });

  // 模拟逐个匹配
  console.log('');
  console.log('逐个匹配测试:');
  console.log('========================================');

  testCases.forEach((testCase) => {
    const extractedValues = extractMatchValues(testCase.namePath, testCase.extractLevels);

    console.log(`\n测试: ${testCase.description}`);
    console.log(`  原始路径: "${testCase.namePath}"`);
    console.log(`  提取层级: ${testCase.extractLevels}`);
    console.log(`  提取的值: [${extractedValues.join(', ')}]`);

    // 逐个匹配
    let matched = false;
    for (const value of extractedValues) {
      const matchedConfig = standardConfigs.find((config) => config.accountPath === value);
      if (matchedConfig) {
        const qtyInfo = matchedConfig.quantity ? `/ ${matchedConfig.quantity}件` : '每件';
        console.log(`  ✓ 匹配成功! 提取值 "${value}" -> 标准配置 [${matchedConfig.id}]: ${matchedConfig.standardHours}${qtyInfo}`);
        matched = true;
        break;
      } else {
        console.log(`  - 尝试匹配 "${value}" -> 未找到`);
      }
    }

    if (!matched && extractedValues.length === 0) {
      console.log(`  ✗ 无提取值（路径可能不完整）`);
    } else if (!matched) {
      console.log(`  ✗ 所有提取值都未匹配`);
    }
  });

  // 总结
  console.log('\n========================================');
  console.log('匹配逻辑说明:');
  console.log('========================================');
  console.log('1. 从劳动力账户路径中提取配置的层级值（如：产品、工序）');
  console.log('2. 将提取的值逐个与标准配置的 accountPath 进行比对');
  console.log('3. 只要有一个值匹配成功，就采用该标准配置');
  console.log('4. 如果所有值都不匹配，则查找未配置层级的通用标准');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});
