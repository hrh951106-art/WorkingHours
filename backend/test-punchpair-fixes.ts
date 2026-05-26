import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('测试 PunchPair 修复结果');
  console.log('========================================\n');

  // 查询现有的PunchPair记录
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202605002',
    },
    include: {
      account: true,  // ✅ 测试新的account关联
      employee: true,
    },
    orderBy: { pairDate: 'desc' },
    take: 5,
  });

  console.log('1. 检查account关联是否返回：');
  punchPairs.forEach(pp => {
    const accountName = pp.account ? pp.account.name : '(null)';
    const accountNamePath = pp.account ? pp.account.namePath : '(null)';
    console.log(`   ID: ${pp.id}`);
    console.log(`   - accountId: ${pp.accountId}`);
    console.log(`   - account.name: ${accountName}`);
    console.log(`   - account.namePath: ${accountNamePath}`);
    console.log(`   - pairDate: ${pp.pairDate.toISOString()}`);
    console.log('');
  });

  console.log('2. 检查pairDate是否使用实际打卡日期：');
  // 查询PunchPair对应的打卡记录
  for (const pp of punchPairs) {
    console.log(`   PunchPair ID ${pp.id}:`);
    console.log(`   - pairDate(UTC): ${pp.pairDate.toISOString()}`);
    console.log(`   - pairDate(本地): ${pp.pairDate.toLocaleString()}`);

    if (pp.inPunchId) {
      const inPunch = await prisma.punchRecord.findUnique({
        where: { id: pp.inPunchId },
      });
      if (inPunch) {
        console.log(`   - inPunchTime: ${inPunch.punchTime.toISOString()}`);
        const inDate = inPunch.punchTime.toISOString().split('T')[0];
        console.log(`   - inPunchTime日期: ${inDate}`);
        const pairDateStr = pp.pairDate.toISOString().split('T')[0];
        const match = inDate === pairDateStr ? '✅' : '❌';
        console.log(`   - 日期匹配: ${match}`);
      }
    }
    console.log('');
  }

  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
