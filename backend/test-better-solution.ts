import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBetterSolution() {
  console.log('=== 测试改进的匹配方案 ===\n');

  const targetDate = new Date('2026-05-19T00:00:00.000Z');
  const productId = 15;
  const orgId = 113;
  const orgName = '苏州工厂/生产1车间/焊接���组//电焊//';

  console.log('方案：从账户名称中提取最后一个非空段作为匹配值\n');

  // 1. 分割路径并过滤空段
  const pathSegments = orgName.split('/').filter(s => s.trim() !== '');
  console.log(`路径段: [${pathSegments.join(', ')}]`);
  console.log(`总段数: ${pathSegments.length}`);

  // 2. 提取最后一个非空段
  const lastValue = pathSegments[pathSegments.length - 1];
  console.log(`最后层级值: "${lastValue}"`);

  // 3. 生成路径组合（只包含最后一个值）
  const pathCombinations = [lastValue];
  console.log(`路径组合: [${pathCombinations.join(', ')}]`);

  // 4. 查询标准工时配置
  console.log('\n查询匹配的标准工时配置:');
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
        console.log(`  ✅ 匹配成功: accountPath="${config.accountPath}", 标准工时=${config.standardHours}/${config.quantity}件 ${isPermanent ? '(永久)' : ''}`);
      });
      return;
    }
  }

  // 5. 如果没有精确匹配，尝试部分匹配（包含）
  console.log('\n尝试部分匹配（标准工时配置包含账户路径的最后一个段）:');
  const allConfigs = await prisma.productStandardHourByLevel.findMany({
    where: {
      productId,
      deletedAt: null,
      status: 'ACTIVE',
      effectiveDate: { lte: targetDate },
    },
  });

  for (const config of allConfigs) {
    if (config.accountPath && lastValue.includes(config.accountPath)) {
      console.log(`  ✅ 部分匹配: accountPath="${config.accountPath}", 标准工时=${config.standardHours}/${config.quantity}件`);
      return;
    }
    // 也检查标准工时配置是否包含最后的值
    if (config.accountPath && config.accountPath.includes(lastValue)) {
      console.log(`  ✅ 反向包含匹配: accountPath="${config.accountPath}", 标准工时=${config.standardHours}/${config.quantity}件`);
      return;
    }
  }

  console.log('\n❌ 无法匹配到任何标准工时配置');
}

checkBetterSolution()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
