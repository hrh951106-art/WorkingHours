import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-10';

  console.log(`=== 测试精益工时计算 ===\n`);

  // 1. 检查摆卡记录
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: employeeNo,
      pairDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    }
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录`);
  punchPairs.forEach(pp => {
    console.log(`  - ID=${pp.id}, shiftId=${pp.shiftId}, accountId=${pp.accountId}`);
    console.log(`    inPunchTime=${pp.inPunchTime}, outPunchTime=${pp.outPunchTime}`);
  });

  // 2. 检查班次信息
  if (punchPairs.length > 0 && punchPairs[0].shiftId) {
    const shift = await prisma.shift.findUnique({
      where: { id: punchPairs[0].shiftId },
      include: { segments: true }
    });

    if (shift) {
      console.log(`\n班次信息: ${shift.name} (${shift.code})`);
      console.log(`标准工时: ${shift.standardHours}小时`);
      console.log(`班段数量: ${shift.segments.length}`);
    }
  }

  // 3. 检查计算出勤代码
  const leanCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
      type: 'LEAN_HOURS',
      calculateHours: true
    }
  });

  console.log(`\n精益工时出勤代码数量: ${leanCodes.length}`);

  // 4. 检查现有的计算结果
  const existingResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: employeeNo,
      calcDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    }
  });

  console.log(`\n现有计算结果数量: ${existingResults.length}`);
  existingResults.forEach(r => {
    console.log(`  - ID=${r.id}, code=${r.calculationAttendanceCodeId}, hours=${r.actualHours}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
