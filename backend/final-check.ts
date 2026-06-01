import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 最终排查：分摊计算是否执行 ==========\n');

  // 1. 检查A01配置的所有分摊结果
  console.log('【1. A01配置的所有分摊结果】\n');
  const a01Config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: { code: 'A01' }
  });

  if (!a01Config) {
    console.log('❌ A01配置不存在');
    return;
  }

  const allResults = await prisma.earnedHoursAllocationResult.findMany({
    where: {
      configId: a01Config.id
    },
    orderBy: {
      recordDate: 'desc'
    },
    take: 20
  });

  console.log(`找到${allResults.length}条分摊结果\n`);

  if (allResults.length === 0) {
    console.log('❌ A01配置从未产生过分摊结果！');
    console.log('\n可能的原因:');
    console.log('  1. 分摊计算从未执行过');
    console.log('  2. 执行时发生错误但未记录');
    console.log('  3. 配置有问题导致计算无法进行');
  } else {
    console.log('最近的分摊结果:');
    for (const r of allResults.slice(0, 5)) {
      console.log(`  日期: ${r.recordDate.toISOString().substring(0, 10)}, 批次: ${r.batchNo}, 分得工时: ${r.allocatedHours?.toFixed(2)}`);
    }

    // 检查是否有5月19日的结果
    console.log('\n【检查5月19日的分摊结果】\n');
    const may19Results = allResults.filter(r =>
      r.recordDate.toISOString().startsWith('2026-05-19')
    );

    if (may19Results.length === 0) {
      console.log('❌ 5月19日没有分摊结果');
      console.log('\n这说明:');
      console.log('  - 分摊计算可能没有执行');
      console.log('  - 或者执行时发生了错误');
    } else {
      console.log(`✅ 5月19日有${may19Results.length}条分摊结果`);
    }
  }

  // 2. 模拟执行分摊计算的关键步骤
  console.log('\n【2. 模拟分摊计算的关键步骤】\n');

  // 获取5月19日的生产记录
  const prodRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  if (!prodRecord) {
    console.log('❌ 5月19日没有生产记录');
    return;
  }

  console.log(`✅ 生产记录存在: ${prodRecord.productName}, 产量${prodRecord.actualQty}`);

  // 获取账户
  const account = await prisma.laborAccount.findFirst({
    where: { id: prodRecord.orgId, status: 'ACTIVE' }
  });

  if (!account) {
    console.log(`❌ 账户${prodRecord.orgId}不存在或不是ACTIVE状态`);
    return;
  }

  console.log(`✅ 账户存在且ACTIVE: ${account.name}`);

  // 查询工时结果
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      workDate: prodRecord.recordDate,
      status: 'ACTIVE',
      attendanceCode: 'A06'
    }
  });

  if (workHourResults.length === 0) {
    console.log(`❌ 没有工时结果`);
    return;
  }

  console.log(`✅ 工时结果存在: ${workHourResults.length}条`);

  // 计算总工时
  const totalWorkHours = workHourResults.reduce((sum, wh) => sum + (wh.workHours || 0), 0);
  console.log(`  总工时: ${totalWorkHours.toFixed(2)}小时`);

  // 3. 最终结论
  console.log('\n【3. 最终结论】\n');
  console.log('✅ 所有数据都存在且正确');
  console.log('✅ 分摊计算应该能够正常执行');

  if (allResults.length === 0) {
    console.log('\n❌ 但是A01配置从未产生过分摊结果！');
    console.log('\n【问题根源】');
    console.log('分摊计算从未成功执行过，或者执行后结果未保存');
    console.log('\n【建议】');
    console.log('1. 立即重新执行A01分摊计算');
    console.log('2. 仔细查看后端日志，确认是否有错误');
    console.log('3. 检查数据库事务是否正常提交');
  } else if (!allResults.some(r => r.recordDate.toISOString().startsWith('2026-05-19'))) {
    console.log('\n❌ 5月19日没有分摊结果，但其他日期有结果');
    console.log('\n【问题根源】');
    console.log('5月19日的分摊计算未执行，或者执行失败');
    console.log('\n【建议】');
    console.log('1. 针对5月19日重新执行分摊计算');
    console.log('2. 查看后端日志，确认失败原因');
  }

  console.log('\n========== 排查完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
