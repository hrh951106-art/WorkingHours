import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check punch record ID 11
  const punch11 = await prisma.punchRecord.findUnique({
    where: { id: 11 },
  });

  console.log('打卡记录 ID 11:');
  console.log('  员工编号:', punch11?.employeeNo);
  console.log('  打卡时间:', punch11?.punchTime.toISOString());
  console.log('  类型:', punch11?.punchType);
  console.log('  账户ID:', punch11?.accountId);

  // Check all punch records for employee 202604003 (not just May 12)
  const allPunches = await prisma.punchRecord.findMany({
    where: { employeeNo: '202604003' },
    orderBy: { punchTime: 'desc' },
    take: 20,
  });

  console.log('\n最近20条打卡记录 (中国时间):');
  allPunches.forEach((p, i) => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    console.log(`${i+1}. ID:${p.id} ${chinaTime.toISOString().replace('T', ' ').substring(0, 19)} (类型: ${p.punchType})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
