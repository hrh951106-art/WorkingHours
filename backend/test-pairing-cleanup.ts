// 测试精益摆卡删除旧数据功能
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPairingCleanup() {
  console.log('========================================');
  console.log('测试精益摆卡删除旧数据功能');
  console.log('========================================\n');

  const pairDate = new Date('2026-05-09T00:00:00');
  const dayStart = new Date(pairDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(pairDate);
  dayEnd.setHours(23, 59, 59, 999);

  // 1. 检查当前数据
  console.log('1. 当前数据统计:');
  const currentCount = await prisma.punchPair.count({
    where: {
      pairDate: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });
  console.log(`   2026-05-09 的摆卡数据: ${currentCount} 条`);
  console.log('');

  // 2. 模拟删除逻辑（不执行）
  console.log('2. 删除逻辑验证:');
  const deleteWhere: any = {
    pairDate: {
      gte: dayStart,
      lte: dayEnd,
    },
  };

  // 如果指定了员工列表，只删除这些员工的数据
  const employeeNos = ['202605002'];
  deleteWhere.employeeNo = {
    in: employeeNos,
  };

  const toDeleteCount = await prisma.punchPair.count({
    where: deleteWhere,
  });

  console.log(`   将删除员工 202605002 的数据: ${toDeleteCount} 条`);
  console.log('');

  // 3. 显示将被删除的数据
  console.log('3. 将被删除的数据:');
  const toDeleteData = await prisma.punchPair.findMany({
    where: deleteWhere,
    orderBy: { id: 'asc' },
  });

  toDeleteData.forEach(pair => {
    console.log(`   ID: ${pair.id}, 员工: ${pair.employeeNo}, 账户: ${pair.accountName}`);
  });
  console.log('');

  console.log('========================================');
  console.log('✅ 删除逻辑验证完成');
  console.log('提示：实际删除将在批量摆卡API调用时执行');
  console.log('========================================');
}

testPairingCleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
