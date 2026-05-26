import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 诊断 2026-05-10 计算结果 ===\n');

  const results = await prisma.calcResult.findMany({
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

  console.log('计算结果详情:');
  results.forEach(r => {
    console.log('\nID: ' + r.id);
    console.log('出勤代码: ' + r.calculationAttendanceCode.name);
    console.log('账户: ' + r.accountName);
    console.log('开始时间: ' + r.punchInTime);
    console.log('结束时间: ' + r.punchOutTime);
    console.log('实际工时: ' + r.actualHours);
  });

  // 查询计算结果表的数据，看是否有其他字段
  console.log('\n\n=== 检查原始计算结果数据 ===\n');
  
  const rawData = await prisma.$queryRaw`
    SELECT id, employeeNo, calcDate, calculationAttendanceCodeId, 
           punchInTime, punchOutTime, actualHours, 
           accountId, accountName, accountPath
    FROM CalcResult 
    WHERE employeeNo = '202605002' 
      AND calcDate >= '2026-05-10' 
      AND calcDate < '2026-05-11'
    ORDER BY id
  `;

  console.log('原始数据:');
  (rawData as any[]).forEach(r => {
    console.log('\nID: ' + r.id);
    console.log('出勤代码ID: ' + r.calculationAttendanceCodeId);
    console.log('账户ID: ' + r.accountId);
    console.log('账户名: ' + r.accountName);
    console.log('实际工时: ' + r.actualHours);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
