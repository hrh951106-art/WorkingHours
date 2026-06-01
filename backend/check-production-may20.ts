import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductionMay20() {
  console.log('=== 检查5月20日产量记录 ===\n');

  const workDate = new Date('2026-05-20T00:00:00.000Z');

  try {
    // 查询5月20日的产量记录
    const productionRecords = await prisma.productionRecord.findMany({
      where: {
        recordDate: workDate,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`5月20日产量记录数: ${productionRecords.length}`);

    if (productionRecords.length === 0) {
      console.log('❌ 没有找到5月20日的产量记录');
      console.log('');
      console.log('这就是A02规则没有生成结果的原因！');
      console.log('');
      console.log('A02规则是基于产量记录进行分摊计算的，不是基于工时记录。');
      console.log('如果没有产量记录，即使有工时数据，A02规则也不会生成分摊结果。');
    } else {
      console.log('\n产量记录列表:');
      productionRecords.forEach((pr, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  ID: ${pr.id}`);
        console.log(`  recordDate: ${pr.recordDate?.toISOString().substring(0, 10)}`);
        console.log(`  productId: ${pr.productId || 'NULL'}`);
        console.log(`  productName: ${pr.productName || 'NULL'}`);
        console.log(`  actualQty: ${pr.actualQty || 0}`);
        console.log(`  totalStdHours: ${pr.totalStdHours || 0}`);
        console.log(`  orgId: ${pr.orgId || 'NULL'}`);
        console.log(`  createdAt: ${pr.createdAt?.toISOString().substring(0, 19)}`);
      });

      console.log('\n✅ 找到了产量记录');
    }

    console.log('');
    console.log('=== 对比工时记录 ===\n');

    // 同时查询工时记录对比
    const workHours = await prisma.workHourResult.findMany({
      where: { workDate: workDate },
    });

    console.log(`5月20日工时记录数: ${workHours.length}`);
    console.log(`5月20日产量记录数: ${productionRecords.length}`);
    console.log('');
    console.log('结论:');
    if (productionRecords.length === 0 && workHours.length > 0) {
      console.log('  ⚠️ 有工时记录，但没有产量记录');
      console.log('  A02规则需要产量记录才能进行分摊计算');
    } else if (productionRecords.length > 0 && workHours.length > 0) {
      console.log('  ✅ 既有工时记录，也有产量记录');
      console.log('  如果A02没有结果，需要进一步排查其他原因');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkProductionMay20()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
