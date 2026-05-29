import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605001';

  console.log('========================================');
  console.log(`检查员工 ${employeeNo} 的挣得工时记录字段完整性`);
  console.log('========================================\n');

  const record = await prisma.workHourResult.findFirst({
    where: {
      employeeNo,
      attendanceCode: 'A07',
    },
  });

  if (!record) {
    console.log('未找到挣得工时记录');
    await prisma.$disconnect();
    return;
  }

  console.log('=== 字段值检查 ===\n');

  // 定义所有字段
  const fields = [
    { name: 'id', value: record.id },
    { name: 'employeeNo', value: record.employeeNo },
    { name: 'workDate', value: record.workDate },
    { name: 'calcDate', value: record.calcDate },
    { name: 'shiftId', value: record.shiftId },
    { name: 'shiftName', value: record.shiftName },
    { name: 'definitionAttendanceCodeId', value: record.definitionAttendanceCodeId },
    { name: 'attendanceCode', value: record.attendanceCode },
    { name: 'attendanceCodeName', value: record.attendanceCodeName },
    { name: 'workHours', value: record.workHours },
    { name: 'accountId', value: record.accountId },
    { name: 'accountName', value: record.accountName },
    { name: 'orgId', value: record.orgId },
    { name: 'sourceType', value: record.sourceType },
    { name: 'source', value: record.source },
    { name: 'status', value: record.status },
    { name: 'createdAt', value: record.createdAt },
    { name: 'updatedAt', value: record.updatedAt },
  ];

  let missingCount = 0;
  fields.forEach((field) => {
    const isMissing = field.value === null || field.value === undefined || field.value === '';
    if (isMissing) {
      missingCount++;
      console.log(`✗ ${field.name}: ${field.value}`);
    } else {
      let displayValue = field.value;
      if (field.value instanceof Date) {
        displayValue = field.value.toISOString().substring(0, 19).replace('T', ' ');
      }
      console.log(`✓ ${field.name}: ${displayValue}`);
    }
  });

  console.log(`\n总计: ${fields.length - missingCount}/${fields.length} 个字段有值`);

  if (missingCount > 0) {
    console.log(`\n⚠️  有 ${missingCount} 个字段缺失值！`);
  } else {
    console.log('\n✅ 所有字段都有值');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});
