import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查 Paul (202605002) 的精益工时计算结果 ===\n');

  const results0509 = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202605002',
      calcDate: {
        gte: new Date('2026-05-09T00:00:00.000Z'),
        lt: new Date('2026-05-10T00:00:00.000Z'),
      },
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('2026-05-09 的计算结果:');
  console.log('共 ' + results0509.length + ' 条');
  results0509.forEach(r => {
    const codeName = r.calculationAttendanceCode ? r.calculationAttendanceCode.name : '无';
    console.log('  - 出勤代码: ' + codeName + ', 账户: ' + r.accountName);
  });

  const results0510 = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202605002',
      calcDate: {
        gte: new Date('2026-05-10T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('\n2026-05-10 的计算结果:');
  console.log('共 ' + results0510.length + ' 条');
  results0510.forEach(r => {
    const codeName = r.calculationAttendanceCode ? r.calculationAttendanceCode.name : '无';
    console.log('  - 出勤代码: ' + codeName + ', 账户: ' + r.accountName);
  });

  const punchPairs0509 = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202605002',
      pairDate: {
        gte: new Date('2026-05-09T00:00:00.000Z'),
        lt: new Date('2026-05-10T00:00:00.000Z'),
      },
    },
    include: {
      account: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('\n2026-05-09 的摆卡数据:');
  console.log('共 ' + punchPairs0509.length + ' 条');
  punchPairs0509.forEach(p => {
    const accountName = p.account ? p.account.namePath : p.accountName;
    console.log('  - ID: ' + p.id + ', 账户: ' + accountName);
  });

  const punchPairs0510 = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202605002',
      pairDate: {
        gte: new Date('2026-05-10T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
    include: {
      account: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('\n2026-05-10 的摆卡数据:');
  console.log('共 ' + punchPairs0510.length + ' 条');
  punchPairs0510.forEach(p => {
    const accountName = p.account ? p.account.namePath : p.accountName;
    console.log('  - ID: ' + p.id + ', 账户: ' + accountName);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
