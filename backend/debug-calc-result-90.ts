import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询CalcResult ID 90
  const calcResult = await prisma.calcResult.findUnique({
    where: { id: 90 },
    include: {
      calculationAttendanceCode: true,
    },
  });

  if (calcResult) {
    const calcDate = new Date(calcResult.calcDate);
    const createdAt = new Date(calcResult.createdAt);

    console.log('CalcResult ID 90:');
    console.log(`  calcDate (原始): ${calcResult.calcDate}`);
    console.log(`  calcDate (ISO): ${calcDate.toISOString()}`);
    console.log(`  calcDate (本地): ${calcDate.toLocaleString('zh-CN')}`);
    console.log(`  calcDate (本地日期): ${calcDate.toLocaleDateString('zh-CN')}`);
    console.log('');
    console.log(`  员工: ${calcResult.employeeNo}`);
    console.log(`  出勤代码: ${calcResult.calculationAttendanceCode?.name}`);
    console.log(`  工时: ${calcResult.actualHours}`);
    console.log(`  shiftId: ${calcResult.shiftId}`);
    console.log(`  shiftName: ${calcResult.shiftName}`);
    console.log(`  上班打卡: ${calcResult.punchInTime}`);
    console.log(`  下班打卡: ${calcResult.punchOutTime}`);
    console.log(`  创建时间: ${createdAt.toLocaleString('zh-CN')}`);
  }

  console.log('\n对应的PunchPair记录:');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202604003',
    },
    orderBy: {
      id: 'desc',
    },
    take: 5,
  });

  punchPairs.forEach(p => {
    const pairDate = new Date(p.pairDate);
    console.log(`\nID: ${p.id}`);
    console.log(`  pairDate (原始): ${p.pairDate}`);
    console.log(`  pairDate (本地日期): ${pairDate.toLocaleDateString('zh-CN')}`);
    console.log(`  shiftId: ${p.shiftId}`);
    console.log(`  上班: ${p.inPunchTime ? new Date(p.inPunchTime).toLocaleTimeString('zh-CN') : '无'}`);
    console.log(`  下班: ${p.outPunchTime ? new Date(p.outPunchTime).toLocaleTimeString('zh-CN') : '无'}`);
  });

  console.log('\n\n查找calcDate为2026-05-12的CalcResult:');
  const may12Results = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202604003',
      calcDate: {
        gte: new Date('2026-05-11T16:00:00.000Z'), // 2026-05-12 00:00:00 GMT+8
        lt: new Date('2026-05-12T16:00:00.000Z'),  // 2026-05-13 00:00:00 GMT+8
      },
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: {
      calcDate: 'desc',
    },
  });

  console.log(`总数: ${may12Results.length}`);
  may12Results.forEach(r => {
    const calcDate = new Date(r.calcDate);
    console.log(`ID: ${r.id}, calcDate: ${calcDate.toISOString()}, 本地日期: ${calcDate.toLocaleDateString('zh-CN')}, 出勤代码: ${r.calculationAttendanceCode?.name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
