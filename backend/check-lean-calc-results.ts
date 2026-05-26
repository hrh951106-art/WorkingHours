import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-10';

  console.log(`=== 查询员工 ${employeeNo} 在 ${date} 的精益工时计算结果 ===\n`);

  // 查询精益工时计算结果
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: employeeNo,
      calcDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      },
      calculationAttendanceCode: {
        type: 'LEAN_HOURS'
      }
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { id: 'asc' }
  });

  console.log(`找到 ${calcResults.length} 条精益工时计算结果\n`);

  if (calcResults.length > 0) {
    calcResults.forEach((result, index) => {
      console.log(`--- 记录 ${index + 1} (ID: ${result.id}) ---`);
      console.log(`计算出勤代码: ${result.calculationAttendanceCode?.code || 'N/A'} (${result.calculationAttendanceCode?.name || 'N/A'})`);
      console.log(`类型: ${result.calculationAttendanceCode?.type || 'N/A'}`);
      console.log(`账户层级配置: ${result.calculationAttendanceCode?.accountLevels || 'N/A'}`);
      console.log(`实际工时: ${result.actualHours} 小时`);
      console.log(`班次: ${result.shiftName || 'N/A'} (ID: ${result.shiftId})`);
      console.log('');
    });
  } else {
    console.log('没有找到精益工时计算结果');
  }

  // 检查该员工的摆卡记录
  console.log('\n=== 检查摆卡记录 ===\n');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: employeeNo,
      pairDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    },
    include: {
      employee: true
    }
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录\n`);
  punchPairs.forEach((pp, idx) => {
    console.log(`--- 摆卡 ${idx + 1} (ID: ${pp.id}) ---`);
    console.log(`日期: ${pp.pairDate}`);
    console.log(`班次: ${pp.shiftName || 'N/A'} (ID: ${pp.shiftId})`);
    console.log(`刷卡账户: ${pp.accountId || 'N/A'}`);
    console.log(`上班时间: ${pp.inPunchTime}`);
    console.log(`下班时间: ${pp.outPunchTime}`);
    console.log('');
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
