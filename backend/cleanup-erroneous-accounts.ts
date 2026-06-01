import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 清理错误的账户并修复账户127
 */
async function cleanupErroneousAccounts() {
  const employeeNo = '202605014';

  console.log('=== 清理错误的账�� ===\n');

  // 1. 查找员工
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo}), ID: ${employee.id}\n`);

  // 2. 获取最新WorkInfoHistory
  const latestWorkInfo = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true,
    },
    select: {
      id: true,
      effectiveDate: true,
      position: true,
      jobLevel: true,
    },
  });

  if (!latestWorkInfo) {
    console.log('❌ 未找到WorkInfoHistory');
    await prisma.$disconnect();
    return;
  }

  console.log(`最新WorkInfoHistory: effectiveDate=${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}, jobLevel=${latestWorkInfo.jobLevel}\n`);

  // 3. 查找所有主账户
  const allAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id, type: 'MAIN' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      code: true,
      status: true,
      effectiveDate: true,
      hierarchyValues: true,
    },
  });

  console.log(`找到 ${allAccounts.length} 个主账户:\n`);
  allAccounts.forEach((acc) => {
    const match = acc.effectiveDate?.toISOString().substring(0, 10) === latestWorkInfo.effectiveDate.toISOString().substring(0, 10);
    console.log(`账户${acc.id}: ${acc.status}, effectiveDate=${acc.effectiveDate?.toISOString().substring(0, 10) || 'NULL'} ${match ? '✅匹配' : '❌错误'}`);
  });

  console.log('\n开始清理...\n');

  // 4. 删除错误的账户（不匹配effectiveDate的账户）
  for (const account of allAccounts) {
    const accountEffectiveDate = account.effectiveDate?.toISOString().substring(0, 10);
    const isMatch = accountEffectiveDate === latestWorkInfo.effectiveDate.toISOString().substring(0, 10);

    if (isMatch) {
      // 这是正确的账户，恢复为ACTIVE
      console.log(`✅ 恢复账户${account.id}为ACTIVE状态`);
      await prisma.laborAccount.update({
        where: { id: account.id },
        data: {
          status: 'ACTIVE',
          expiryDate: null,
        },
      });

      // 更新Level 7的值
      if (account.hierarchyValues) {
        try {
          const hv = JSON.parse(account.hierarchyValues);
          const level7 = hv.find((level: any) => level.level === 7);

          if (level7 && level7.selectedValue?.code !== latestWorkInfo.jobLevel) {
            console.log(`   更新Level 7: ${level7.selectedValue?.code} → ${latestWorkInfo.jobLevel}`);

            level7.selectedValue = {
              code: latestWorkInfo.jobLevel,
              name: latestWorkInfo.jobLevel === 'LEVEL_008' ? '五类一级' : '五类二级',
              value: latestWorkInfo.jobLevel,
            };
            level7.selectedValueLabel = latestWorkInfo.jobLevel === 'LEVEL_008' ? '五类一级' : '五类二级';

            // 更新hierarchyValues
            await prisma.laborAccount.update({
              where: { id: account.id },
              data: {
                hierarchyValues: JSON.stringify(hv),
              },
            });
          }
        } catch (e) {
          console.log('   解析hierarchyValues失败:', e);
        }
      }
    } else {
      // 这是错误的账户，需要删除
      console.log(`❌ 删除错误的账户${account.id}`);

      // 先检查有关联记录
      const employeeLaborAccount = await prisma.employeeLaborAccount.findFirst({
        where: { accountId: account.id },
      });

      if (employeeLaborAccount) {
        console.log(`   删除关联记录 EmployeeLaborAccount ${employeeLaborAccount.id}`);
        await prisma.employeeLaborAccount.delete({
          where: { id: employeeLaborAccount.id },
        });
      }

      // 删除账户
      await prisma.laborAccount.delete({
        where: { id: account.id },
      });
    }
  }

  console.log('\n✅ 清理完成！\n');

  // 5. 验证最终结果
  const finalAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id, type: 'MAIN' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      code: true,
      status: true,
      effectiveDate: true,
      hierarchyValues: true,
    },
  });

  console.log('最终账户状态:');
  finalAccounts.forEach((acc) => {
    console.log(`账户${acc.id}: ${acc.status}, effectiveDate=${acc.effectiveDate?.toISOString().substring(0, 10)}`);

    if (acc.hierarchyValues) {
      try {
        const hv = JSON.parse(acc.hierarchyValues);
        const level7 = hv.find((level: any) => level.level === 7);
        if (level7?.selectedValue) {
          console.log(`  Level 7: ${level7.selectedValue.code}`);
        }
      } catch (e) {}
    }
  });

  console.log('\n✅ 验证结果：');
  console.log(`- 账户数量: ${finalAccounts.length} (期望: 1)`);
  console.log(`- 账户状态: ${finalAccounts[0]?.status} (期望: ACTIVE)`);
  console.log(`- 生效日期: ${finalAccounts[0]?.effectiveDate?.toISOString().substring(0, 10)} (期望: ${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)})`);

  await prisma.$disconnect();
}

cleanupErroneousAccounts()
  .then(() => {
    console.log('\n清理完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('清理失败:', error);
    process.exit(1);
  });
