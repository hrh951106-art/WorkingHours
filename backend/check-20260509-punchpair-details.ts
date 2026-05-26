import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMay9PunchPairs() {
  console.log('========================================');
  console.log('详细分析 2026-05-09 的4条摆卡记录');
  console.log('========================================\n');

  const punchPairs = await prisma.punchPair.findMany({
    where: {
      id: { in: [174, 175, 176, 177] },
    },
    include: {
      employee: true,
      account: true,
      inPunch: {
        include: {
          device: true,
        },
      },
      outPunch: {
        include: {
          device: true,
        },
      },
    },
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录\n`);

  punchPairs.forEach((pair) => {
    const formatTime = (ts: number | null) => ts ? new Date(ts).toISOString().substring(11, 16) : '-';
    const formatDate = (ts: number | null) => ts ? new Date(ts).toISOString().substring(0, 10) : '-';

    console.log(`--- ID: ${pair.id} ---`);
    console.log(`  日期: ${formatDate(pair.pairDate as any)}`);
    console.log(`  上班卡: ${formatTime(pair.inPunchTime as any)} (设备${pair.inPunch?.deviceId})`);
    console.log(`  下班卡: ${formatTime(pair.outPunchTime as any)} (设备${pair.outPunch?.deviceId})`);
    console.log(`  账户ID: ${pair.accountId}`);
    console.log(`  账户: ${pair.account?.name || '-'}`);
    console.log(`  工时: ${pair.workHours}`);
    console.log(`  状态: ${pair.status || '-'}`);
    console.log(`  计算时间: ${pair.calcTime ? new Date(pair.calcTime).toISOString() : '-'}`);
    console.log('');
  });

  // 2. 查询这些摆卡记录的工时计算结果
  console.log('\n【工时计算结果】\n');

  const calcResults = await prisma.calcResult.findMany({
    where: {
      punchPairId: { in: [174, 175, 176, 177] },
    },
    include: {
      calculationAttendanceCode: true,
    },
  });

  console.log(`找到 ${calcResults.length} 条工时计算结果\n`);

  if (calcResults.length === 0) {
    console.log('❌ 没有工时计算结果\n');

    // 检查是否应该计算工时
    console.log('【分析原因】\n');

    punchPairs.forEach((pair) => {
      console.log(`摆卡 ${pair.id}:`);

      if (!pair.inPunchTime || !pair.outPunchTime) {
        console.log(`  ❌ 缺少上班卡或下班卡`);
      } else {
        console.log(`  ✅ 有上班卡和下班卡`);

        if (!pair.accountId) {
          console.log(`  ❌ 账户ID为空`);
        } else {
          console.log(`  ✅ 账户ID: ${pair.accountId}`);
        }

        if (pair.workHours === 0 || pair.workHours === null) {
          console.log(`  ❌ 工时为0或null`);
        } else {
          console.log(`  ✅ 工时: ${pair.workHours}`);
        }
      }
      console.log('');
    });

    // 3. 检查排班信息
    console.log('【检查排班信息】\n');

    const employee = await prisma.employee.findFirst({
      where: { employeeNo: '202604003' },
      select: { id: true },
    });

    if (employee) {
      const schedules = await prisma.schedule.findMany({
        where: {
          employeeId: employee.id,
          scheduleDate: new Date('2026-05-09'),
        },
        include: {
          shift: true,
        },
      });

      console.log(`找到 ${schedules.length} 条排班记录\n`);

      if (schedules.length === 0) {
        console.log('❌ 该员工在2026-05-09没有排班');
        console.log('   可能原因：没有排班时，工时计算需要使用无排班配置');
      }
    }

    // 4. 检查计算执行记录
    console.log('\n【检查计算执行记录】\n');

    const calcExecutions = await prisma.calculationExecution.findMany({
      where: {
        calcDate: new Date('2026-05-09'),
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log(`找到 ${calcExecutions.length} 条计算执行记录\n`);

    calcExecutions.forEach((exec) => {
      console.log(`  执行时间: ${exec.createdAt.toISOString()}`);
      console.log(`  状态: ${exec.status}`);
      console.log(`  员工数: ${exec.employeeCount}`);
      console.log(`  记录数: ${exec.recordCount}`);
      console.log(`  错误: ${exec.errorMessage || '-'}`);
      console.log('');
    });

  } else {
    calcResults.forEach((result) => {
      console.log(`--- 摆卡 ${result.punchPairId} ---`);
      console.log(`  出勤代码: ${result.calculationAttendanceCode?.name || '-'}`);
      console.log(`  标准工时: ${result.standardHours}`);
      console.log(`  实际工时: ${result.actualHours}`);
      console.log('');
    });
  }

  console.log('========================================');
}

checkMay9PunchPairs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('错误:', err);
    process.exit(1);
  });
