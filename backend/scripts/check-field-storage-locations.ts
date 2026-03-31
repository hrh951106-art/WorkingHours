import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFieldStorage() {
  console.log('检查字段存储位置:\n');

  // 获取最新员工
  const employee = await prisma.employee.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!employee) {
    console.log('没有找到员工数据');
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${employee.name} (${employee.employeeNo})\n`);

  // 检查关键字段的存储
  const fields = [
    { name: '政治面貌', employeeField: 'politicalStatus', workInfoField: null },
    { name: '婚姻状况', employeeField: 'maritalStatus', workInfoField: null },
    { name: '性别', employeeField: 'gender', workInfoField: null },
    { name: '职级', employeeField: null, workInfoField: 'jobLevel' },
    { name: '职位', employeeField: null, workInfoField: 'position' },
    { name: '员工类型', employeeField: null, workInfoField: 'employeeType' },
  ];

  console.log('Employee 表字段:');
  console.log('========================================');
  fields.forEach(f => {
    if (f.employeeField) {
      const value = employee[f.employeeField];
      console.log(`${f.employeeField}: ${value || 'NULL'}`);
    }
  });

  // 检查 WorkInfoHistory
  const workInfo = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true,
    },
  });

  console.log('\nWorkInfoHistory 表字段:');
  console.log('========================================');
  if (workInfo) {
    fields.forEach(f => {
      if (f.workInfoField) {
        const value = workInfo[f.workInfoField];
        console.log(`${f.workInfoField}: ${value || 'NULL'}`);
      }
    });
  } else {
    console.log('未找到 WorkInfoHistory 记录');
  }

  await prisma.$disconnect();
}

checkFieldStorage().catch(console.error);
