import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 重新检查accountPath匹配 ==========\n');

  // 生产记录的组织名称
  const orgName = '苏州工厂/生产1车间/焊接班组//电焊//';
  console.log(`组织名称: ${orgName}\n`);

  // 分割层级
  const segments = orgName.split('/').filter(s => s.trim() !== '');
  console.log(`分割后的层级: [${segments.join(', ')}]`);

  // 生成所有可能的路径组合
  const pathCombinations = [];
  for (let len = segments.length; len >= 1; len--) {
    for (let i = 0; i <= segments.length - len; i++) {
      const combination = segments.slice(i, i + len).join('/');
      pathCombinations.push(combination);
    }
  }
  console.log(`\n生成的路径组合 (${pathCombinations.length}个):`);
  for (let i = 0; i < pathCombinations.length; i++) {
    console.log(`  ${i + 1}. ${pathCombinations[i]}`);
  }

  // 检查5月19日的匹配
  console.log('\n【检查5月19日的匹配】\n');
  const recordDate = new Date('2026-05-19');
  recordDate.setHours(0, 0, 0, 0);

  // 按优先级检查每个路径组合
  for (let i = 0; i < pathCombinations.length; i++) {
    const path = pathCombinations[i];

    // 查询有明确日期区间的配置
    const configWithExpiry = await prisma.productStandardHourByLevel.findFirst({
      where: {
        productId: 15,
        accountPath: path,
        effectiveDate: { lte: recordDate },
        expiryDate: { gte: recordDate },
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    if (configWithExpiry) {
      console.log(`✅ 路径"${path}"匹配到配置 (有日期区间):`);
      console.log(`  配置ID: ${configWithExpiry.id}`);
      console.log(`  账户路径: ${configWithExpiry.accountPath}`);
      console.log(`  标准工时: ${configWithExpiry.standardHours}`);
      console.log(`  标准件数: ${configWithExpiry.quantity || 1}`);
      console.log(`  生效日期: ${configWithExpiry.effectiveDate.toISOString().substring(0, 10)}`);
      console.log(`  失效日期: ${configWithExpiry.expiryDate ? configWithExpiry.expiryDate.toISOString().substring(0, 10) : '无限期'}`);
      console.log('');
    }

    // 查询永久配置（expiryDate为null）
    const configPermanent = await prisma.productStandardHourByLevel.findFirst({
      where: {
        productId: 15,
        accountPath: path,
        effectiveDate: { lte: recordDate },
        expiryDate: null,
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    if (configPermanent) {
      console.log(`✅ 路径"${path}"匹配到配置 (永久):`);
      console.log(`  配置ID: ${configPermanent.id}`);
      console.log(`  账户路径: ${configPermanent.accountPath}`);
      console.log(`  标准工时: ${configPermanent.standardHours}`);
      console.log(`  标准件数: ${configPermanent.quantity || 1}`);
      console.log(`  生效日期: ${configPermanent.effectiveDate.toISOString().substring(0, 10)}`);
      console.log(`  失效日期: 无限期`);
      console.log('');
    }
  }

  console.log('========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
