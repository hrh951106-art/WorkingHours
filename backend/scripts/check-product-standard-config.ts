import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('查询大桶产品的焊接工序标准配置\n');

  // ��询产品标准配置（带层级）
  const configs = await prisma.productStandardHourByLevel.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      productName: { contains: '大桶' },
      accountLevel: '8', // 工序层级的levelId是8
    },
    orderBy: { effectiveDate: 'desc' },
  });

  console.log(`找到 ${configs.length} 条配置\n`);

  configs.forEach((config, index) => {
    console.log(`=== 配置 ${index + 1} ===`);
    console.log(`ID: ${config.id}`);
    console.log(`产品: ${config.productName} (ID: ${config.productId})`);
    console.log(`账户层级: ${config.accountLevel}`);
    console.log(`账户路径: ${config.accountPath || '-'}`);
    console.log(`生效日期: ${config.effectiveDate.toISOString().substring(0, 10)}`);
    console.log(`失效日期: ${config.expiryDate ? config.expiryDate.toISOString().substring(0, 10) : '永久（null）'}`);
    console.log(`标准件数(quantity): ${config.quantity}`);
    console.log(`标准工时(standardHours): ${config.standardHours}`);
    console.log(`创建时间: ${config.createdAt.toISOString().substring(0, 19).replace('T', ' ')}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  });
