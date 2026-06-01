import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 删除员工202605017的所有主劳动力账户及其关联记录
 */
async function deleteEmployeeAccounts() {
  const employeeNo = '202605017';

  console.log('=== 删除员工主劳动力账户 ===\n');

  // 1. 查找员工
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log(`❌ 员工 ${employeeNo} 不存在`);
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo}), ID: ${employee.id}\n`);

  // 2. 查找所有主账户
  const allAccounts = await prisma.laborAccount.findMany({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      code: true,
      status: true,
      effectiveDate: true,
    },
  });

  if (allAccounts.length === 0) {
    console.log('ℹ️ 该员工没有主劳动力账户');
    await prisma.$disconnect();
    return;
  }

  console.log(`找到 ${allAccounts.length} 个主账户:\n`);
  allAccounts.forEach((acc) => {
    console.log(`  账户${acc.id}: ${acc.status}, effectiveDate=${acc.effectiveDate?.toISOString().substring(0, 10) || 'NULL'}`);
  });

  console.log('\n开始删除...\n');

  // 3. 逐个删除账户及其关联记录
  for (const account of allAccounts) {
    console.log(`处理账户${account.id}...`);

    // 3.1 删除 EmployeeLaborAccount 关联记录
    const employeeLaborAccounts = await prisma.employeeLaborAccount.findMany({
      where: { accountId: account.id },
      select: { id: true },
    });

    if (employeeLaborAccounts.length > 0) {
      console.log(`  删除 ${employeeLaborAccounts.length} 条 EmployeeLaborAccount 记录`);
      for (const ela of employeeLaborAccounts) {
        await prisma.employeeLaborAccount.delete({
          where: { id: ela.id },
        });
      }
    }

    // 3.2 检查 WorkHourResult 关联记录
    const workHourResults = await prisma.workHourResult.findMany({
      where: { accountId: account.id },
      select: { id: true },
    });

    if (workHourResults.length > 0) {
      console.log(`  删除 ${workHourResults.length} 条 WorkHourResult 记录`);
      for (const whr of workHourResults) {
        await prisma.workHourResult.delete({
          where: { id: whr.id },
        });
      }
    }

    // 3.3 检查 EarnedHoursAllocationResult 关联记录（可能是sourceAccountId或targetAccountId）
    const allocationResults = await prisma.earnedHoursAllocationResult.findMany({
      where: {
        OR: [
          { sourceAccountId: account.id },
          { targetAccountId: account.id },
        ],
      },
      select: { id: true },
    });

    if (allocationResults.length > 0) {
      console.log(`  删除 ${allocationResults.length} 条 EarnedHoursAllocationResult 记录`);
      for (const ear of allocationResults) {
        await prisma.earnedHoursAllocationResult.delete({
          where: { id: ear.id },
        });
      }
    }

    // 3.4 检查 PunchRecord 关联记录
    const punchRecords = await prisma.punchRecord.findMany({
      where: { accountId: account.id },
      select: { id: true },
    });

    if (punchRecords.length > 0) {
      console.log(`  删除 ${punchRecords.length} 条 PunchRecord 记录`);
      for (const pr of punchRecords) {
        await prisma.punchRecord.delete({
          where: { id: pr.id },
        });
      }
    }

    // 3.5 删除主账户
    console.log(`  ✅ 删除账户${account.id}`);
    await prisma.laborAccount.delete({
      where: { id: account.id },
    });

    console.log('');
  }

  console.log('✅ 删除完成！\n');

  // 4. 验证删除结果
  const remainingAccounts = await prisma.laborAccount.findMany({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
    },
  });

  console.log(`剩余账户数量: ${remainingAccounts.length}`);
  if (remainingAccounts.length === 0) {
    console.log('✅ 所有主账户已成功删除');
  } else {
    console.log('⚠️ 仍有账户未删除');
  }

  await prisma.$disconnect();
}

deleteEmployeeAccounts()
  .then(() => {
    console.log('\n操作完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('操作失败:', error);
    process.exit(1);
  });
