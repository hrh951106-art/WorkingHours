import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkEmployeeDetailData() {
  console.log('检查员工详情数据格式:');
  console.log('========================================\n');

  // 获取最新的员工
  const latestEmployee = await prisma.employee.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      org: true,
    },
  });

  if (!latestEmployee) {
    console.log('没有找到员工数据');
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${latestEmployee.name} (${latestEmployee.employeeNo})`);
  console.log(`所属组织: ${latestEmployee.org?.name || 'N/A'}`);
  console.log();

  // 获取当前工作信息
  const currentWorkInfo = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: latestEmployee.id,
      isCurrent: true,
    },
    include: {
      org: true,
    },
  });

  if (!currentWorkInfo) {
    console.log('未找到当前工作信息');
    await prisma.$disconnect();
    return;
  }

  console.log('当前工作信息:');
  console.log('----------------------------------------');
  console.log(`职位: ${currentWorkInfo.position || 'NULL'}`);
  console.log(`职级: ${currentWorkInfo.jobLevel || 'NULL'}`);
  console.log(`员工类型: ${currentWorkInfo.employeeType || 'NULL'}`);
  console.log(`组织ID: ${currentWorkInfo.orgId || 'NULL'}`);
  console.log(`组织名称: ${currentWorkInfo.org?.name || 'NULL'}`);
  console.log();

  // 解析customFields
  console.log('CustomFields (JSON):');
  console.log('----------------------------------------');
  const customFields = JSON.parse(currentWorkInfo.customFields || '{}');
  console.log(JSON.stringify(customFields, null, 2));
  console.log();

  // 检查几个关键字段的数据类型
  console.log('关键字段值检查:');
  console.log('========================================');

  const fields = ['position', 'jobLevel', 'employeeType', 'gender', 'maritalStatus', 'politicalStatus', 'nation'];

  for (const field of fields) {
    const value = currentWorkInfo[field];
    const customValue = customFields[field];

    console.log(`\n${field}:`);
    console.log(`  WorkInfoHistory字段值: ${value || 'NULL'}`);
    console.log(`  customFields值: ${JSON.stringify(customValue)}`);

    // 检查是ID还是文本
    if (typeof value === 'number') {
      console.log(`  类型: NUMBER (可能是ID)`);
    } else if (typeof value === 'string') {
      if (/^\d+$/.test(value)) {
        console.log(`  类型: STRING数字 (可能是ID)`);
      } else {
        console.log(`  类型: STRING文本`);
      }
    }
  }

  await prisma.$disconnect();
}

checkEmployeeDetailData().catch(console.error);
