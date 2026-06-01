import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function safeDeleteEmployeeAccounts() {
  const employeeNo = '202605013';
  console.log(`=== 安全删除员工 ${employeeNo} 的所有主劳动力账户 ===\n`);

  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('未找到员工');
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo})`);

  // 1. 删除WorkHourResult引用
  console.log('\n1. 删除WorkHourResult记录...');
  const deletedWorkHourResults = await prisma.workHourResult.deleteMany({
    where: { employeeId: employee.id },
  });
  console.log(`   ✅ 删除 ${deletedWorkHourResults.count} 条WorkHourResult记录`);

  // 2. 删除EarnedHoursAllocationResult引用
  console.log('\n2. 删除EarnedHoursAllocationResult记录...');
  const deletedAllocationResults = await prisma.earnedHoursAllocationResult.deleteMany({
    where: { sourceEmployeeNo: employeeNo },
  });
  console.log(`   ✅ 删除 ${deletedAllocationResults.count} 条EarnedHoursAllocationResult记录`);

  // 3. 删除PunchRecord引用
  console.log('\n3. 删除PunchRecord记录...');
  const deletedPunchRecords = await prisma.punchRecord.deleteMany({
    where: { employeeNo },
  });
  console.log(`   ✅ 删除 ${deletedPunchRecords.count} 条PunchRecord记录`);

  // 4. 删除EmployeeLaborAccount引用
  console.log('\n4. 删除EmployeeLaborAccount记录...');
  const deletedEmployeeLaborAccounts = await prisma.employeeLaborAccount.deleteMany({
    where: { employeeId: employee.id },
  });
  console.log(`   ✅ 删除 ${deletedEmployeeLaborAccounts.count} 条EmployeeLaborAccount记录`);

  // 5. 删除所有劳动力账户
  console.log('\n5. 删除所有劳动力账户...');
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    select: { id: true, code: true },
    orderBy: { id: 'asc' },
  });

  console.log(`   找到 ${accounts.length} 个账户`);

  for (const account of accounts) {
    await prisma.laborAccount.delete({
      where: { id: account.id },
    });
    console.log(`   ✅ 删除账户 ${account.id}: ${account.code}`);
  }

  console.log('\n✅ 所有账户及相关记录已删除');

  await prisma.$disconnect();
}

safeDeleteEmployeeAccounts()
  .then(() => {
    console.log('\n删除完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('删除失败:', error);
    process.exit(1);
  });
