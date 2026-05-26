import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 删除所有相关数据 ===\n');

  try {
    // 1. 删除计算结果表（CalcResult）
    console.log('步骤1：删除计算结果表数据...');
    const calcResultCount = await prisma.calcResult.deleteMany({});
    console.log(`✅ 删除了 ${calcResultCount.count} 条计算结果记录`);

    // 2. 删除精益摆卡表（PunchPair）
    console.log('\n步骤2：删除精益摆卡表数据...');
    const punchPairCount = await prisma.punchPair.deleteMany({});
    console.log(`✅ 删除了 ${punchPairCount.count} 条摆卡记录`);

    // 3. ���除打卡记录表（PunchRecord）
    console.log('\n步骤3：删除打卡记录表数据...');
    const punchRecordCount = await prisma.punchRecord.deleteMany({});
    console.log(`✅ 删除了 ${punchRecordCount.count} 条打卡记录`);

    console.log('\n=== 所有数据删除完成 ===\n');

    // 验证删除结果
    console.log('=== 验证删除结果 ===\n');

    const calcResultRemaining = await prisma.calcResult.count();
    const punchPairRemaining = await prisma.punchPair.count();
    const punchRecordRemaining = await prisma.punchRecord.count();

    console.log(`计算结果表剩余记录: ${calcResultRemaining}`);
    console.log(`精益摆卡表剩余记录: ${punchPairRemaining}`);
    console.log(`打卡记录表剩余记录: ${punchRecordRemaining}`);

    if (calcResultRemaining === 0 && punchPairRemaining === 0 && punchRecordRemaining === 0) {
      console.log('\n✅ 所有表的数据都已成功清空');
    } else {
      console.log('\n⚠️ 部分表还有数据残留');
    }

  } catch (error: any) {
    console.error('\n❌ 删除数据时出错:', error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n脚本执行成功');
    process.exit(0);
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
