import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo: '202604003',
      punchDate: new Date('2026-05-12'),
    },
    select: {
      id: true,
      workStartPunchTime: true,
      workEndPunchTime: true,
      workStartShiftId: true,
      workEndShiftId: true,
      workStartShiftName: true,
      workEndShiftName: true,
      ruleId: true,
      ruleName: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('找到', pairs.length, '条考勤摆卡记录:');
  pairs.forEach((p, i) => {
    console.log(`\n记录 ${i+1}:`);
    console.log(`  ID: ${p.id}`);
    console.log(`  上班打卡时间: ${p.workStartPunchTime?.toISOString() || 'null'}`);
    console.log(`  下班打卡时间: ${p.workEndPunchTime?.toISOString() || 'null'}`);
    console.log(`  上班班次: ${p.workStartShiftName || 'null'} (ID: ${p.workStartShiftId || 'null'})`);
    console.log(`  下班班次: ${p.workEndShiftName || 'null'} (ID: ${p.workEndShiftId || 'null'})`);
    console.log(`  规则: ${p.ruleName} (ID: ${p.ruleId})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
