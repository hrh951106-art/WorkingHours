import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPunchPairTable() {
  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00');

  console.log('========================================');
  console.log(`查询 PunchPair 表中 ${employeeNo} 在 2026-05-09 的数据`);
  console.log('========================================\n');

  // 1. 查询PunchPair表
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: targetDate,
    },
    include: {
      employee: true,
      account: true,
      inPunch: {
        include: {
          device: true,
          account: true,
        },
      },
      outPunch: {
        include: {
          device: true,
          account: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  console.log(`【PunchPair 表】找到 ${punchPairs.length} 条摆卡数据\n`);

  if (punchPairs.length > 0) {
    punchPairs.forEach((pair, index) => {
      console.log(`--- 摆卡 ${index + 1} ---`);
      console.log(`  ID: ${pair.id}`);
      console.log(`  上班打卡: ${pair.inPunchTime?.toISOString() || '-'}`);
      console.log(`  下班打卡: ${pair.outPunchTime?.toISOString() || '-'}`);
      console.log(`  账户: ${pair.account?.name || '-'}`);
      console.log(`  账户ID: ${pair.accountId || '-'}`);
      console.log(`  工时: ${pair.workHours || '-'}`);
      console.log(`  状态: ${pair.status || '-'}`);
      console.log(`  上班卡设备: ${pair.inPunch?.device?.name || '-'}`);
      console.log(`  下班卡设备: ${pair.outPunch?.device?.name || '-'}`);
      console.log('');
    });
  }

  // 2. 查询这些摆卡记录是否已计算工时
  const pairIds = punchPairs.map(p => p.id);

  if (pairIds.length > 0) {
    console.log(`【检查工时计算结果】\n`);

    const calcResults = await prisma.calcResult.findMany({
      where: {
        punchPairId: { in: pairIds },
      },
      include: {
        calculationAttendanceCode: true,
      },
    });

    console.log(`找到 ${calcResults.length} 条工时计算结果\n`);

    if (calcResults.length > 0) {
      calcResults.forEach((result) => {
        console.log(`--- 工时结果 ---`);
        console.log(`  摆卡ID: ${result.punchPairId}`);
        console.log(`  出勤代码: ${result.calculationAttendanceCode?.name || '-'}`);
        console.log(`  标准工时: ${result.standardHours}`);
        console.log(`  实际工时: ${result.actualHours}`);
        console.log('');
      });
    } else {
      console.log('❌ 没有找到工时计算结果');
    }
  }

  console.log('========================================');
}

checkPunchPairTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('错误:', err);
    process.exit(1);
  });
