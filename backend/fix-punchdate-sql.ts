import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 使用原始 SQL 修复 punchDate ===\n');

  const employeeNo = '202604003';

  // 1. 查询需要修复的记录
  const records = await prisma.$queryRaw`
    SELECT id, "employeeNo", "punchDate", "workStartPunchTime", "workEndPunchTime"
    FROM "AttendancePunchPair"
    WHERE "employeeNo" = ${employeeNo}
    ORDER BY id
  ` as any[];

  console.log(`找到 ${records.length} 条记录\n`);

  // 2. 对每条记录进行修复
  for (const record of records) {
    const punchDate = new Date(record.punchDate);
    const workStartDate = new Date(record.workStartPunchTime);

    const currentPunchDateStr = punchDate.toISOString().split('T')[0];
    const workStartDateStr = workStartDate.toISOString().split('T')[0];

    if (currentPunchDateStr !== workStartDateStr) {
      console.log(`修复 ID=${record.id}: ${currentPunchDateStr} → ${workStartDateStr}`);

      // 使用原始 SQL 更新
      await prisma.$executeRaw`
        UPDATE "AttendancePunchPair"
        SET "punchDate" = ${workStartDate}
        WHERE id = ${record.id}
      `;

      console.log(`  ✓ 完成\n`);
    }
  }

  // 3. 验证修复结果
  console.log('\n验证修复结果:\n');
  const updatedRecords = await prisma.$queryRaw`
    SELECT id, "employeeNo", "punchDate", "workStartPunchTime"
    FROM "AttendancePunchPair"
    WHERE "employeeNo" = ${employeeNo}
    ORDER BY "punchDate" ASC
  ` as any[];

  let allCorrect = true;
  updatedRecords.forEach((record: any) => {
    const punchDate = new Date(record.punchDate).toISOString().split('T')[0];
    const startDate = new Date(record.workStartPunchTime).toISOString().split('T')[0];

    if (punchDate !== startDate) {
      allCorrect = false;
      console.log(`  ❌ ID=${record.id}: punchDate=${punchDate}, 实际=${startDate}`);
    } else {
      console.log(`  ✓ ID=${record.id}: punchDate=${punchDate}`);
    }
  });

  console.log(`\n${allCorrect ? '✓ 所有记录修复成功！' : '⚠️  仍有记录需要检查'}`);
}

main()
  .then(() => console.log('\n完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
