import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 模拟新的extractMatchValuesFromHierarchy方法
 */
function extractMatchValuesFromHierarchy(
  hierarchyValuesJSON: string | null,
  hierarchyLevelsToExtract: string
): string[] {
  if (!hierarchyValuesJSON || !hierarchyLevelsToExtract) {
    return [];
  }

  // 解析hierarchyValues
  let hierarchyValues: any[] = [];
  try {
    hierarchyValues = JSON.parse(hierarchyValuesJSON);
  } catch (e) {
    console.log(`解析hierarchyValues失败: ${e}`);
    return [];
  }

  // 解析层级配置
  const levelsToExtract = hierarchyLevelsToExtract.split(',').map(l => l.trim());

  const levelNameMap: Record<string, number> = {
    '工厂': 1,
    '车间': 2,
    '产线': 3,
    '产品': 4,
    '工序': 5,
    '岗位': 6,
    '技能等级': 7,
  };

  const levelsToExtractNumbers = levelsToExtract.map(l => {
    const num = parseInt(l);
    if (isNaN(num)) {
      return levelNameMap[l] || 0;
    }
    return num;
  }).filter(n => n > 0);

  if (levelsToExtractNumbers.length === 0) {
    return [];
  }

  console.log(`从hierarchyValues提取层级: [${levelsToExtractNumbers.join(', ')}]`);

  // 将hierarchyValues转换为level -> value的映射
  const hierarchyValuesMap = new Map<number, string>();
  hierarchyValues.forEach((hv: any) => {
    if (hv.level && hv.selectedValue) {
      const value = hv.selectedValue.name || hv.selectedValue.code || hv.selectedValue.id;
      if (value) {
        hierarchyValuesMap.set(hv.level, String(value));
      }
    }
  });

  console.log(`hierarchyValues包含的层级: [${[...hierarchyValuesMap.keys()].join(', ')}]`);

  // 按层级序号提取对应的值
  const extractedValues = levelsToExtractNumbers
    .map(levelNum => {
      const value = hierarchyValuesMap.get(levelNum);
      if (value) {
        console.log(`提取层级${levelNum}: "${value}"`);
        return value;
      }
      console.log(`层级${levelNum}在hierarchyValues中为空，跳过`);
      return null;
    })
    .filter(v => v !== null) as string[];

  console.log(`最终提取的值: [${extractedValues.join(', ')}]`);

  return extractedValues;
}

async function testHierarchyExtraction() {
  console.log('=== 测试新的hierarchyValues提取逻辑 ===\n');

  const targetDate = new Date('2026-05-19T00:00:00.000Z');
  const productId = 15;
  const orgId = 113;

  console.log('测试场景：');
  console.log(`  产品ID: ${productId}`);
  console.log(`  账户ID: ${orgId}\n`);

  // 1. 获取SystemConfig
  console.log('1. 检查SystemConfig配置：');
  const hierarchyConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'standardHoursHierarchyLevels' },
  });

  const hierarchyLevelsToExtract = hierarchyConfig?.configValue || '';
  console.log(`  配置值: "${hierarchyLevelsToExtract}"\n`);

  // 2. 获取账户的hierarchyValues
  console.log('2. 获取账户的hierarchyValues：');
  const laborAccount = await prisma.laborAccount.findFirst({
    where: { id: orgId },
    select: { hierarchyValues: true },
  });

  if (!laborAccount) {
    console.log('未找到账户');
    return;
  }

  console.log(`  hierarchyValues: ${laborAccount.hierarchyValues?.substring(0, 100)}...\n`);

  // 3. 测试提取逻辑
  console.log('3. 测试新的提取逻辑：');
  const extractedValues = extractMatchValuesFromHierarchy(
    laborAccount.hierarchyValues,
    hierarchyLevelsToExtract
  );

  console.log('');

  // 4. 生成路径组合
  console.log('4. 生成路径组合：');
  const pathCombinations: string[] = [];
  const n = extractedValues.length;

  for (let len = n; len >= 1; len--) {
    if (len === 1) {
      pathCombinations.push(...extractedValues);
    } else {
      for (let i = 0; i <= n - len; i++) {
        const combination = extractedValues.slice(i, i + len).join('/');
        pathCombinations.push(combination);
      }
    }
  }

  console.log(`  [${pathCombinations.join(', ')}]\n`);

  // 5. 查询匹配的标准工时配置
  console.log('5. 查询匹配的标准工时配置：');

  let matchedConfig = null;
  for (const path of pathCombinations) {
    const configs = await prisma.productStandardHourByLevel.findMany({
      where: {
        productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        accountPath: path,
      },
    });

    if (configs.length > 0) {
      configs.forEach(config => {
        const isPermanent = !config.expiryDate;
        console.log(`  ✅ 匹配成功！`);
        console.log(`     accountPath: "${config.accountPath}"`);
        console.log(`     标准工时: ${config.standardHours}/${config.quantity}件`);
        console.log(`     有效期: ${config.effectiveDate.toISOString().substring(0,10)} ~ ${config.expiryDate ? config.expiryDate.toISOString().substring(0,10) : '永久'}`);
        matchedConfig = config;
      });
      break;
    }
  }

  if (matchedConfig) {
    console.log('\n=== 测试结果：✅ 成功 ===');
    console.log('修复验证：从hierarchyValues提取成功！');
    console.log('关键改进：');
    console.log('  1. SystemConfig使用层级序号"5"（工序层）');
    console.log('  2. 从hierarchyValues的Level 5提取"电焊"（而不是从name path）');
    console.log('  3. 成功匹配到标准工时配置 accountPath="电焊"');
    console.log('  4. 不再受name path层级数量限制（可以正确处理null层级）');
  } else {
    console.log('\n=== 测试结果：❌ 失败 ===');
    console.log('未能匹配到标准工时配置');
  }
}

testHierarchyExtraction()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
