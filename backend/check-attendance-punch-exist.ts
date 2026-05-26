import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查 AttendancePunchPair 表中的记录情况 ===\n');

  // 1. 检查总记录数
  const totalCount = await prisma.attendancePunchPair.count();
  console.log(`1. AttendancePunchPair 总记录数: ${totalCount}`);

  // 2. 检查是否有员工 202604003 的记录
  const employeeCount = await prisma.attendancePunchPair.count({
    where: { employeeNo: '202604003' },
  });
  console.log(`2. 员工 202604003 的考勤摆卡记录数: ${employeeCount}`);

  // 3. 查看该员工的所有考勤摆卡记录
  const employeeRecords = await prisma.attendancePunchPair.findMany({
    where: { employeeNo: '202604003' },
    include: { account: true },
    orderBy: { punchDate: 'desc' },
    take: 10,
  });

  console.log('\n3. 员工 202604003 最近的考勤摆卡记录:');
  if (employeeRecords.length === 0) {
    console.log('  没有找到任何考勤摆卡记录');
  } else {
    employeeRecords.forEach((record, idx) => {
      const date = record.punchDate.toISOString().split('T')[0];
      const startTime = record.workStartPunchTime?.toISOString() || 'null';
      const endTime = record.workEndPunchTime?.toISOString() || 'null';
      console.log(`  记录${idx + 1}: 日期=${date}, 上班卡=${startTime}, 下班卡=${endTime}, 规则=${record.ruleName}`);
    });
  }

  // 4. 对比：检查 PunchPair 表中该员工的记录数
  const punchPairCount = await prisma.punchPair.count({
    where: { employeeNo: '202604003' },
  });
  console.log(`\n4. 员工 202604003 的精益摆卡记录数 (PunchPair): ${punchPairCount}`);
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
