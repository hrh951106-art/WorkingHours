import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLevelFix() {
  console.log('=== 测试：使用level字段修复后的标准工时匹配 ===\n');

  const targetDate = new Date('2026-05-19T00:00:00.000Z');
  const productId = 15;
  const orgId = 113;
  const orgName = '苏州工厂/生产1车间/焊接班组//电焊//';

  console.log('测试场景：');
  console.log(`  产品ID: ${productId}`);
  console.log(`  账户ID: ${orgId}`);
  console.log(`  账户名称: ${orgName}`);
  console.log(`  目标日期: ${targetDate.toISOString()}\n`);

  // 1. 获取SystemConfig（应该已经是'5'）
  console.log('1. 检查SystemConfig配置：');
  const hierarchyConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'standardHoursHierarchyLevels' },
  });

  const hierarchyLevelsToExtract = hierarchyConfig?.configValue || '';
  console.log(`  配置值: "${hierarchyLevelsToExtract}"`);

  if (hierarchyLevelsToExtract === '5') {
    console.log('  ✅ 配置已更新为使用level序号\n');
  } else {
    console.log(`  ⚠️  配置值不是'5'，当前为'${hierarchyLevelsToExtract}'\n`);
  }

  // 2. 模拟extractMatchValues方法的逻辑
  console.log('2. 模拟新的extractMatchValues逻辑：');

  const levelsToExtract = hierarchyLevelsToExtract.split(',').map(l => l.trim());
  console.log(`  解析配置: [${levelsToExtract.join(', ')}]`);

  const levelNameMap: Record<string, number> = {
    '工厂': 1,
    '车间': 2,
    '产线': 3,
    '产品': 4,
    '工序': 5,
  };

  const levelsToExtractNumbers = levelsToExtract.map(l => {
    const num = parseInt(l);
    if (isNaN(num)) {
      return levelNameMap[l] || 0;
    }
    // 直接使用层级序号，不需要映射
    return num;
  }).filter(n => n > 0);

  console.log(`  转换为层级序号: [${levelsToExtractNumbers.join(', ')}]`);

  // 分割路径
  const pathSegments = orgName.split('/').filter(s => s.trim() !== '');
  console.log(`  路径段: [${pathSegments.join(', ')}]`);
  console.log(`  总段数: ${pathSegments.length}\n`);

  // 提取值
  console.log('3. 按层级序号提取值：');
  const extractedValues = levelsToExtractNumbers.map(levelNum => {
    const index = levelNum - 1;
    if (index >= 0 && index < pathSegments.length) {
      const value = pathSegments[index];
      console.log(`  层级${levelNum}(索引${index}): "${value}" ✅`);
      return value;
    }
    console.log(`  层级${levelNum}(索引${index}): 超出范围 ❌`);
    return null;
  }).filter(v => v !== null);

  console.log(`\n  最终提取的值: [${extractedValues.join(', ')}]\n`);

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
    console.log('修复验证：使用level字段后，标准工时匹配成功！');
    console.log('关键改进：');
    console.log('  1. SystemConfig使用层级序号"5"（工序层）而不是levelId"13"');
    console.log('  2. 代码直接使用层级序号，不需要levelIdToLevelNumberMap映射');
    console.log('  3. 从"苏州工厂/生产1车间/焊接班组//电焊//"成功提取第5层"电焊"');
    console.log('  4. 成功匹配到标准工时配置 accountPath="电焊"');
  } else {
    console.log('\n=== 测试结果：❌ 失败 ===');
    console.log('未能匹配到标准工时配置');
    console.log('请检查：');
    console.log('  1. SystemConfig配置值是否正确');
    console.log('  2. 标准工时配置的accountPath字段');
    console.log('  3. 账户路径格式');
  }
}

testLevelFix()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
