import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 验证 punchDate 更新结果 ===\n');

  const employeeNo = '202604003';

  // 直接查询数据库中的原始值
  const records = await prisma.$queryRaw`
    SELECT id, "employeeNo", "punchDate", "workStartPunchTime", "workEndPunchTime"
    FROM "AttendancePunchPair"
    WHERE "employeeNo" = ${employeeNo}
    ORDER BY "punchDate" ASC
  ` as any[];

  console.log(`数据库中存储的原始值:\n`);
  records.forEach((record: any) => {
    const punchDate = new Date(record.punchDate).toISOString().split('T')[0];
    const startDate = new Date(record.workStartPunchTime).toISOString().split('T')[0];
    const match = punchDate === startDate ? '✓' : '❌';

    console.log(`${match} ID=${record.id}:`);
    console.log(`   punchDate: ${punchDate}`);
    console.log(`   workStartPunchTime: ${startDate}`);
    console.log('');
  });
}

main()
  .then(() => console.log('完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
