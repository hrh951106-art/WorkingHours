import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStandardHourMatch() {
  console.log('=== 检查标准工时配置匹配 ===\n');

  const targetDate = new Date('2026-05-19T00:00:00.000Z');
  const productId = 15;
  const orgId = 113;
  const orgName = '苏州工厂/生产1车间/焊接班组//电焊//';

  console.log(`产品ID: ${productId}`);
  console.log(`账户ID: ${orgId}`);
  console.log(`账户名称: ${orgName}`);
  console.log(`目标日期: ${targetDate.toISOString()}\n`);

  // 1. 获取标准工时层级配置
  console.log('1. 获取系统配置的提取层级:');
  const hierarchyConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'standardHoursHierarchyLevels' },
  });

  const hierarchyLevelsToExtract = hierarchyConfig?.configValue || '';
  console.log(`  配置的提取层级: "${hierarchyLevelsToExtract || '(无配置)'}"`);

  // 2. 模拟提取匹配值的过程
  console.log('\n2. 从账户名称中提取匹配值:');
  console.log(`  账户名称: "${orgName}"`);

  // 分割路径
  const pathSegments = orgName.split('/').filter(s => s.trim() !== '');
  console.log(`  分割后: [${pathSegments.join(', ')}]`);

  // 解析层级配置
  const levelNameMap: Record<string, number> = {
    '工厂': 1,
    '车间': 2,
    '产线': 3,
    '产品': 4,
    '工序': 5,
  };

  const levelsToExtract = hierarchyLevelsToExtract ? hierarchyLevelsToExtract.split(',').map(l => l.trim()) : [];

  console.log(`  要提取的层级: [${levelsToExtract.join(', ')}]`);

  const levelsToExtractNumbers = levelsToExtract.map(l => {
    const num = parseInt(l);
    if (isNaN(num)) {
      return levelNameMap[l] || 0;
    }
    return num;
  }).filter(n => n > 0);

  console.log(`  转换为层级序号: [${levelsToExtractNumbers.join(', ')}]`);

  // 提取值
  const extractedValues = levelsToExtractNumbers.map(levelNum => {
    const index = levelNum - 1;
    if (index >= 0 && index < pathSegments.length) {
      const value = pathSegments[index];
      console.log(`    层级${levelNum}(索引${index}): "${value}"`);
      return value;
    }
    console.log(`    层级${levelNum}(索引${index}): 超出范围`);
    return null;
  }).filter(v => v !== null);

  console.log(`\n  最终提取的值: [${extractedValues.join(', ')}]`);

  // 3. 生成路径组合
  console.log('\n3. 生成路径组合（从精确到粗粒度）:');
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

  console.log(`  [${pathCombinations.join(', ')}]`);

  // 4. 查询标准工时配置
  console.log('\n4. 按优先级查询标准工时配置:');

  // 先查有日期区间的
  for (const path of pathCombinations) {
    const config = await prisma.productStandardHourByLevel.findFirst({
      where: {
        productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        expiryDate: { gte: targetDate },
        accountPath: path,
      },
    });

    if (config) {
      console.log(`  ✅ 找到匹配（有日期区间）: accountPath="${config.accountPath}", 标准工时=${config.standardHours}/${config.quantity}件`);
      return;
    }
  }

  // 再查永久的
  for (const path of pathCombinations) {
    const config = await prisma.productStandardHourByLevel.findFirst({
      where: {
        productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        expiryDate: null,
        accountPath: path,
      },
    });

    if (config) {
      console.log(`  ✅ 找到匹配（永久）: accountPath="${config.accountPath}", 标准工时=${config.standardHours}/${config.quantity}件`);
      return;
    }
  }

  // 5. 查询所有该产品的标准工时配置，看看有哪些
  console.log('\n5. 查询该产品的所有标准工时配置:');
  const allConfigs = await prisma.productStandardHourByLevel.findMany({
    where: {
      productId,
      deletedAt: null,
      status: 'ACTIVE',
      effectiveDate: { lte: targetDate },
    },
  });

  console.log(`  找到 ${allConfigs.length} 条配置:`);
  allConfigs.forEach((config) => {
    console.log(`    - accountPath: "${config.accountPath || '(全局)'}", 标准工时: ${config.standardHours}/${config.quantity}件, 日期区间: ${config.effectiveDate.toISOString().substring(0,10)} ~ ${config.expiryDate ? config.expiryDate.toISOString().substring(0,10) : '永久'}`);
  });

  // 6. 总结
  console.log('\n=== 问题分析 ===');
  console.log('路径匹配分析:');
  console.log(`  工时账户路径: ${orgName}`);
  console.log(`  提取的匹配值: [${extractedValues.join(', ')}]`);
  console.log(`  生成的路径组合: [${pathCombinations.join(', ')}]`);
  console.log(`  标准工时配置路径: ${allConfigs.map(c => `"${c.accountPath || '(全局)'}"`).join(', ')}`);

  const match = pathCombinations.some(p => allConfigs.some(c => c.accountPath === p));
  if (match) {
    console.log('\n✅ 应该可以匹配到标准工时配置');
  } else {
    console.log('\n❌ 无法匹配到标准工时配置！');
    console.log('   原因：提取的路径组合与标准工时配置的accountPath都不匹配');
    console.log('   建议：检查标准工时配置的accountPath字段是否正确');
  }
}

checkStandardHourMatch()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
