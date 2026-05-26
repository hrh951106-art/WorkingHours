import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetDate = new Date('2026-05-12T00:00:00.000Z');
  const nextDate = new Date('2026-05-13T00:00:00.000Z');

  console.log('=== 检查 2026-05-12 的打卡和摆卡数据 ===\n');

  // 1. 查询打卡记录
  console.log('1. 打卡记录:');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      punchTime: {
        gte: targetDate,
        lt: nextDate,
      },
    },
    include: {
      device: {
        include: {
          group: true,
        },
      },
      account: true,
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log(`找到 ${punchRecords.length} 条打卡记录`);
  punchRecords.forEach((punch) => {
    const timeStr = punch.punchTime.toISOString();
    const deviceGroup = punch.device?.group?.name || 'null';
    const accountPath = punch.account?.namePath || 'null';
    console.log(`  员工: ${punch.employeeNo}, 时间: ${timeStr}, 类型: ${punch.punchType}, 设备组: ${deviceGroup}, 账户: ${accountPath}`);
  });

  // 2. 查询摆卡记录
  console.log('\n2. 摆卡记录:');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      pairDate: targetDate,
    },
    include: {
      inPunch: true,
      outPunch: true,
      account: true,
      employee: true,
    },
    orderBy: { inPunchTime: 'asc' },
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录`);
  punchPairs.forEach((pair) => {
    const inTime = pair.inPunchTime?.toISOString() || 'null';
    const outTime = pair.outPunchTime?.toISOString() || 'null';
    const accountPath = pair.account?.namePath || 'null';
    console.log(`  摆卡ID: ${pair.id}, 员工: ${pair.employeeNo}, 进: ${inTime}, 出: ${outTime}, 工时: ${pair.workHours}h, 账户: ${accountPath}`);
  });

  // 3. 查询工时结果
  console.log('\n3. 工时结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: targetDate,
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  console.log(`找到 ${calcResults.length} 条工时结果`);
  calcResults.forEach((result) => {
    const inTime = result.punchInTime?.toISOString() || 'null';
    const outTime = result.punchOutTime?.toISOString() || 'null';
    const accountName = result.accountName || 'null';
    const codeName = result.calculationAttendanceCode?.name || 'null';
    console.log(`  员工: ${result.employeeNo}, 进: ${inTime}, 出: ${outTime}, 实际工时: ${result.actualHours}h, 账户: ${accountName}, 出勤代码: ${codeName}`);
  });
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
