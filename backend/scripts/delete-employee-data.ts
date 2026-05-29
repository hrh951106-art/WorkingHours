import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始删除员工数据...');

  // 删除条件
  const employeeNo = '202605002';
  const targetDate = new Date('2026-05-27T00:00:00.000Z');
  const nextDate = new Date('2026-05-28T00:00:00.000Z');
  const targetAccountPath = 'DH/DH01/DH0101/-/A01';

  // 1. 查询计算结果表中的数据
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: {
        gte: targetDate,
        lt: nextDate
      },
      accountPath: targetAccountPath
    }
  });

  console.log(`找到 ${calcResults.length} 条计算结果记录`);

  for (const result of calcResults) {
    console.log(`计算结果: ID=${result.id}, 员工=${result.employeeNo}, 账户=${result.accountPath}, 标准工时=${result.standardHours}, 实际工时=${result.actualHours}`);
  }

  const deletedCalcResults = await prisma.calcResult.deleteMany({
    where: {
      employeeNo,
      calcDate: {
        gte: targetDate,
        lt: nextDate
      },
      accountPath: targetAccountPath
    }
  });

  console.log(`✅ 已删除 ${deletedCalcResults.count} 条计算结果记录`);

  // 2. 查询工时结果表中的数据
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      workDate: {
        gte: targetDate,
        lt: nextDate
      },
      accountPath: targetAccountPath
    }
  });

  console.log(`\n找到 ${workHourResults.length} 条工时结果记录`);

  for (const result of workHourResults) {
    const startHour = result.startTime ? result.startTime.toISOString().substring(11, 19) : 'N/A';
    const endHour = result.endTime ? result.endTime.toISOString().substring(11, 19) : 'N/A';
    console.log(`工时结果: ID=${result.id}, 员工=${result.employeeNo}, 账户=${result.accountPath}, 工时=${result.workHours}, 出勤代码=${result.attendanceCodeName}, 时间段=${startHour} - ${endHour}, 数据来源=${result.sourceType}`);
  }

  const deletedWorkHourResults = await prisma.workHourResult.deleteMany({
    where: {
      employeeNo,
      workDate: {
        gte: targetDate,
        lt: nextDate
      },
      accountPath: targetAccountPath
    }
  });

  console.log(`\n✅ 已删除 ${deletedWorkHourResults.count} 条工时结果记录`);
  console.log('\n✅ 删除完成！');
}

main()
  .catch((e) => {
    console.error('删除失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
