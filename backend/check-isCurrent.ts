import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIsCurrent() {
  const employeeNo = '202605013';
  console.log(`=== 检查员工 ${employeeNo} WorkInfoHistory的isCurrent字段 ===\n`);

  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true },
  });

  if (!employee) {
    console.log('未找到员工');
    return;
  }

  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      position: true,
      jobLevel: true,
      isCurrent: true,
      effectiveDate: true,
      endDate: true,
    },
  });

  console.log(`找到 ${workInfoHistory.length} 条WorkInfoHistory记录\n`);

  workInfoHistory.forEach((info, idx) => {
    console.log(`记录 ${idx + 1} (ID: ${info.id}):`);
    console.log(`  isCurrent: ${info.isCurrent}`);
    console.log(`  生效日期: ${info.effectiveDate}`);
    console.log(`  结束日期: ${info.endDate || 'NULL'}`);
    console.log(`  职位: ${info.position || 'NULL'}`);
    console.log(`  职级: ${info.jobLevel || 'NULL'}`);
    console.log('');
  });

  console.log('分析：');
  const currentRecord = workInfoHistory.find(r => r.isCurrent === true);
  if (currentRecord) {
    console.log('  ✅ 找到isCurrent=true的记录');
    console.log(`  职位: ${currentRecord.position || 'NULL'}`);
    console.log(`  职级: ${currentRecord.jobLevel || 'NULL'}`);
  } else {
    console.log('  ❌ 没有isCurrent=true的记录');
    console.log('  这导致account.service.ts查询WorkInfoHistory时找不到数据');
  }

  await prisma.$disconnect();
}

checkIsCurrent()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
