import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 删除 Paul 的计算结果并触发重新计算 ===\n');

  // 删除计算结果
  const deleted = await prisma.calcResult.deleteMany({
    where: {
      employeeNo: '202605002',
      calcDate: {
        gte: new Date('2026-05-09T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
  });

  console.log('已删除 ' + deleted.count + ' 条计算结果');

  // 触发重新计算（通过摆卡记录）
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202605002',
      pairDate: {
        gte: new Date('2026-05-09T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
    orderBy: [
      { pairDate: 'asc' },
      { id: 'asc' },
    ],
  });

  console.log('\n找到 ' + punchPairs.length + ' 条摆卡记录');
  console.log('触发重新计算...\n');

  // 导入计算服务并触发计算
  const { LeanHoursCalculationService } = await import('./lean-hours-calculation.service');
  const calcService = new LeanHoursCalculationService(prisma);

  let totalResults = 0;
  for (const pair of punchPairs) {
    try {
      const results = await calcService.calculateFromPunchPair(pair.id);
      totalResults += results.length;
      console.log('摆卡ID ' + pair.id + ' (' + pair.pairDate.toISOString().split('T')[0] + '): 生成 ' + results.length + ' 条结果');
    } catch (error: any) {
      console.error('摆卡ID ' + pair.id + ' 计算失败:', error.message);
    }
  }

  console.log('\n重新计算完成，共生成 ' + totalResults + ' 条结果');

  // 查询新的计算结果
  const newResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202605002',
      calcDate: {
        gte: new Date('2026-05-09T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: [
      { calcDate: 'asc' },
      { id: 'asc' },
    ],
  });

  console.log('\n=== 新的计算结果 ===\n');
  const groupedResults: { [key: string]: any[] } = {};
  newResults.forEach(r => {
    const dateStr = r.calcDate.toISOString().split('T')[0];
    if (!groupedResults[dateStr]) {
      groupedResults[dateStr] = [];
    }
    groupedResults[dateStr].push(r);
  });

  Object.keys(groupedResults).sort().forEach(dateStr => {
    console.log(dateStr + ':');
    groupedResults[dateStr].forEach(r => {
      console.log('  - ' + r.calculationAttendanceCode.name + ': ' + r.accountName);
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
