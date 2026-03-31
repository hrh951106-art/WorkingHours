import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkEmployeeData() {
  console.log('检查最新新增人员的数据存储情况:');
  console.log('==========================================\n');

  // 获取最新的员工
  const latestEmployee = await prisma.employee.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!latestEmployee) {
    console.log('没有找到员工数据');
    await prisma.$disconnect();
    return;
  }

  console.log(`最新员工: ${latestEmployee.name} (${latestEmployee.employeeNo})`);
  console.log(`创建时间: ${latestEmployee.createdAt}`);
  console.log();

  // 查询WorkInfoHistory表来查看字段数据
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: {
      employeeId: latestEmployee.id,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log(`该员工共有 ${workInfoHistory.length} 条工作信息历史记录\n`);

  // 显示所有数据
  for (let i = 0; i < workInfoHistory.length; i++) {
    const field = workInfoHistory[i];
    console.log(`${i + 1}. ${field.fieldName}: ${field.fieldValue || 'NULL'}`);
  }

  // 检查几个关键字段
  console.log('\n\n关键字段数据检查:');
  console.log('========================================');

  const keyFields = ['jobLevel', 'entryDate', 'gender', 'position', 'orgId'];

  for (const fieldName of keyFields) {
    const field = workInfoHistory.find(f => f.fieldName === fieldName);
    if (field) {
      console.log(`\n${fieldName}:`);
      console.log(`  值: ${field.fieldValue || 'NULL'}`);
      console.log(`  valueId: ${field.valueId || 'NULL'}`);
    } else {
      console.log(`\n${fieldName}: 未找到数据`);
    }
  }

  await prisma.$disconnect();
}

checkEmployeeData().catch(console.error);
