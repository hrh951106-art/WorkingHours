import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkHourFullInfo() {
  console.log('=== 检查5月20日工时数据完整信息 ===\n');

  try {
    const workDate = new Date('2026-05-20T00:00:00.000Z');

    // 查询工时数据，包括customFields
    const workHours = await prisma.workHourResult.findMany({
      where: { workDate: workDate },
      orderBy: { employeeNo: 'asc' },
    });

    console.log(`总共: ${workHours.length} 条记录\n`);

    workHours.forEach((wh, index) => {
      console.log(`记录 ${index + 1}: 员工 ${wh.employeeNo}`);
      console.log(`  workDate: ${wh.workDate?.toISOString().substring(0, 10)}`);
      console.log(`  workHours: ${wh.workHours}`);
      console.log(`  attendanceCode: ${wh.attendanceCode || 'NULL'}`);
      console.log(`  attendanceCodeName: ${wh.attendanceCodeName || 'NULL'}`);
      console.log(`  accountId: ${wh.accountId || 'NULL'}`);
      console.log(`  accountPath: ${wh.accountPath || 'NULL'}`);
      console.log(`  accountName: ${wh.accountName || 'NULL'}`);
      console.log(`  customFields: ${wh.customFields || 'NULL'}`);

      if (wh.customFields) {
        try {
          const customFields = JSON.parse(wh.customFields);
          console.log('  customFields内容:');
          Object.entries(customFields).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });

          // 检查岗位
          const position = customFields['position'] || customFields['FIELD_position'];
          if (position) {
            const isNotPOST001 = position !== 'POST_001';
            const marker = isNotPOST001 ? '✅' : '❌';
            console.log(`    岗位 ${position} != POST_001: ${marker}`);
          } else {
            console.log('    岗位字段: NULL ❌');
          }
        } catch (e) {
          console.log('  解析customFields失败');
        }
      }
      console.log('');
    });

    // 检查员工表中的position字段
    console.log('=== 检查员工表的岗位信息 ===\n');

    const employeeNos = workHours.map(wh => wh.employeeNo);

    const employees = await prisma.employee.findMany({
      where: {
        employeeNo: { in: employeeNos },
      },
      select: {
        id: true,
        employeeNo: true,
        name: true,
        customFields: true,
      },
    });

    employees.forEach((emp) => {
      console.log(`员工: ${emp.employeeNo} - ${emp.name}`);
      console.log(`  customFields: ${emp.customFields || 'NULL'}`);

      if (emp.customFields) {
        try {
          const customFields = JSON.parse(emp.customFields);
          console.log('  customFields内容:');
          Object.entries(customFields).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });

          const position = customFields['position'] || customFields['FIELD_position'];
          if (position) {
            const isNotPOST001 = position !== 'POST_001';
            const marker = isNotPOST001 ? '✅' : '❌';
            console.log(`    岗位 ${position} != POST_001: ${marker}`);
          }
        } catch (e) {
          console.log('  解析customFields失败');
        }
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkWorkHourFullInfo()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
