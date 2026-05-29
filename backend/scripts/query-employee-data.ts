import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('查询员工数据...');

  // 1. 查询该员工在指定日期的所有计算结果
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202605002',
      calcDate: {
        gte: new Date('2026-05-27T00:00:00.000Z'),
        lt: new Date('2026-05-28T00:00:00.000Z')
      }
    }
  });

  console.log(`\n找到 ${calcResults.length} 条计算结果记录:`);

  for (const result of calcResults) {
    console.log(`  ID=${result.id}, 账户=${result.accountPath}, 标准工时=${result.standardHours}, 实际工时=${result.actualHours}, 上班时间=${result.punchInTime?.toISOString()}, 下班时间=${result.punchOutTime?.toISOString()}`);
  }

  // 2. 查询该员工在指定日期的所有工时结果
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      employeeNo: '202605002',
      workDate: {
        gte: new Date('2026-05-27T00:00:00.000Z'),
        lt: new Date('2026-05-28T00:00:00.000Z')
      }
    }
  });

  console.log(`\n找到 ${workHourResults.length} 条工时结果记录:`);

  for (const result of workHourResults) {
    console.log(`  ID=${result.id}, 账户=${result.accountPath}, 工时=${result.workHours}, 出勤代码=${result.attendanceCodeName}, 开始时间=${result.startTime?.toISOString()}, 结束时间=${result.endTime?.toISOString()}, 数据来源=${result.sourceType}`);
  }
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
