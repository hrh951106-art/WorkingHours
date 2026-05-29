import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('测试标准工时匹配逻辑 - 提取层级');
  console.log('========================================\n');

  // 模拟 extractMatchPath 逻辑
  const extractMatchPath = (namePath: string, hierarchyLevelsToExtract: string): string => {
    if (!namePath || !hierarchyLevelsToExtract) {
      return namePath || '';
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

    return extractedValues.join('/');
  };

  // 测试用例
  const testCases = [
    { 
      namePath: '///大桶/焊接', 
      extractLevels: '产品,工序',
      expected: '大桶/焊接',
      description: '产品层+工序层'
    },
    { 
      namePath: '//焊接', 
      extractLevels: '产品,工序',
      expected: '焊接',
      description: '仅工序层'
    },
    { 
      namePath: '///大桶', 
      extractLevels: '产品,工序',
      expected: '大桶',
      description: '仅产品层'
    },
    { 
      namePath: '大华工厂/W1总装车间/W1总装L1产线//焊接', 
      extractLevels: '产品,工序',
      expected: '焊接',
      description: '完整路径（工厂/车间/产线/产品/工序）'
    },
    { 
      namePath: '大华工厂/W1总装车间', 
      extractLevels: '工厂,车间',
      expected: '大华工厂/W1总装车间',
      description: '提取工厂和车间'
    },
  ];

  console.log('测试用例:');
  console.log('========================================');
  
  testCases.forEach((testCase) => {
    const result = extractMatchPath(testCase.namePath, testCase.extractLevels);
    const status = result === testCase.expected ? '✓' : '✗';
    console.log(`${status} ${testCase.description}`);
    console.log(`  原始路径: "${testCase.namePath}"`);
    console.log(`  提取层级: ${testCase.extractLevels}`);
    console.log(`  提取结果: "${result}"`);
    console.log(`  期望结果: "${testCase.expected}"`);
    console.log('');
  });

  // 查询数据库中的标准配置
  console.log('');
  console.log('数据库中的标准配置:');
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
    },
  });

  standardConfigs.forEach((config) => {
    const pathInfo = config.accountPath ? `"${config.accountPath}"` : '(未配置层级)';
    console.log(`  [${config.id}] ${config.productName} - accountPath: ${pathInfo}`);
  });

  // 模拟匹配
  console.log('');
  console.log('模拟匹配结果:');
  console.log('========================================');

  testCases.forEach((testCase) => {
    const matchPath = extractMatchPath(testCase.namePath, testCase.extractLevels);
    
    // 查找匹配的标准配置
    const matchedConfigs = standardConfigs.filter((config) => {
      return config.accountPath === matchPath;
    });

    if (matchedConfigs.length > 0) {
      console.log(`✓ "${testCase.namePath}" -> 提取: "${matchPath}" -> 匹配到 ${matchedConfigs.length} 条标准`);
    } else {
      console.log(`✗ "${testCase.namePath}" -> 提取: "${matchPath}" -> 未匹配`);
    }
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});
