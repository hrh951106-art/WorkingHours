import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查ProductStandardHourByLevel表 ==========\n');

  // 1. 查询产品ID=15的所有配置
  console.log('【1. 产品ID=15的配置】\n');
  const configsById = await prisma.productStandardHourByLevel.findMany({
    where: {
      productId: 15,
      deletedAt: null
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`找到 ${configsById.length} 个配置\n`);

  if (configsById.length > 0) {
    for (let i = 0; i < configsById.length; i++) {
      const config = configsById[i];
      console.log(`配置${i + 1}:`);
      console.log(`  ID: ${config.id}`);
      console.log(`  产品名称: ${config.productName}`);
      console.log(`  账户层级: ${config.accountLevel}`);
      console.log(`  账户路径: ${config.accountPath || '(无)'}`);
      console.log(`  标准工时: ${config.standardHours}`);
      console.log(`  标准件数: ${config.quantity || '未设置'}`);
      console.log(`  生效日期: ${config.effectiveDate.toISOString().substring(0, 10)}`);
      console.log(`  失效日期: ${config.expiryDate ? config.expiryDate.toISOString().substring(0, 10) : '无限期'}`);
      console.log(`  状态: ${config.status}`);
      console.log('');
    }
  } else {
    console.log('❌ 没有找到产品ID=15的配置');
  }

  // 2. 查询产品名称包含"大桶"的配置
  console.log('【2. 产品名称包含"大桶"的配置】\n');
  const configsByName = await prisma.productStandardHourByLevel.findMany({
    where: {
      productName: { contains: '大桶' },
      deletedAt: null
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`找到 ${configsByName.length} 个配置\n`);

  if (configsByName.length > 0) {
    for (let i = 0; i < configsByName.length; i++) {
      const config = configsByName[i];
      console.log(`配置${i + 1}:`);
      console.log(`  ID: ${config.id}`);
      console.log(`  产品ID: ${config.productId}`);
      console.log(`  产品名称: ${config.productName}`);
      console.log(`  账户层级: ${config.accountLevel}`);
      console.log(`  账户路径: ${config.accountPath || '(无)'}`);
      console.log(`  标准工时: ${config.standardHours}`);
      console.log(`  标准件数: ${config.quantity || '未设置'}`);
      console.log(`  生效日期: ${config.effectiveDate.toISOString().substring(0, 10)}`);
      console.log(`  状态: ${config.status}`);
      console.log('');
    }
  } else {
    console.log('❌ 没有找到产品名称包含"大桶"的配置');
  }

  // 3. 模拟分摊计算的匹配逻辑
  console.log('【3. 模拟分摊计算的匹配逻辑】\n');

  // 生产记录的组织名称
  const orgName = '苏州工厂/生产1车间/焊接班组//电焊//';
  console.log(`组织名称: ${orgName}`);

  // 从系统配置中获取提取层级
  const hierarchyConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'standardHoursHierarchyLevels' }
  });

  const hierarchyLevelsToExtract = hierarchyConfig?.configValue || '';
  console.log(`配置的提取层级: ${hierarchyLevelsToExtract || '(无配置)'}`);

  // 提取匹配值（按照"/"分割）
  const segments = orgName.split('/').filter(s => s.trim() !== '');
  console.log(`分割后的层级: [${segments.join(', ')}]`);

  // 生成所有可能的路径组合（从精确到粗粒度）
  const pathCombinations = [];
  for (let len = segments.length; len >= 1; len--) {
    for (let i = 0; i <= segments.length - len; i++) {
      const combination = segments.slice(i, i + len).join('/');
      pathCombinations.push(combination);
    }
  }
  console.log(`生成的路径组合: [${pathCombinations.join(', ')}]`);

  // 4. 检查5月19日应该匹配的配置
  console.log('\n【4. 检查5月19日应该匹配的配置】\n');
  const recordDate = new Date('2026-05-19');
  recordDate.setHours(0, 0, 0, 0);

  for (const path of pathCombinations) {
    const matchingConfig = await prisma.productStandardHourByLevel.findFirst({
      where: {
        productId: 15,
        accountLevel: path,
        effectiveDate: { lte: recordDate },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: recordDate } }
        ],
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    if (matchingConfig) {
      console.log(`✅ 路径"${path}"匹配到配置:`);
      console.log(`  配置ID: ${matchingConfig.id}`);
      console.log(`  标准工时: ${matchingConfig.standardHours}`);
      console.log(`  标准件数: ${matchingConfig.quantity || 1}`);
    }
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
