import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseEmployee202605014() {
  const employeeNo = '202605014';
  console.log(`=== 排查员工 ${employeeNo} 的账户生成问题 ===\n`);

  // 1. 查询员工基本信息
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true, orgId: true },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    await prisma.$disconnect();
    return;
  }

  console.log('1. 员工基本信息：');
  console.log(`  ID: ${employee.id}`);
  console.log(`  姓名: ${employee.name}`);
  console.log(`  组织ID: ${employee.orgId}`);
  console.log('');

  // 2. 查询工作信息历史
  console.log('2. 查询工作信息历史（WorkInfoHistory）：');
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    select: {
      id: true,
      effectiveDate: true,
      endDate: true,
      position: true,
      jobLevel: true,
      isCurrent: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 5,
  });

  console.log(`  找到 ${workInfoHistory.length} 条记录\n`);
  workInfoHistory.forEach((info, idx) => {
    console.log(`  记录 ${idx + 1} (ID: ${info.id}):`);
    console.log(`    生效日期: ${info.effectiveDate.toISOString().substring(0, 10)}`);
    console.log(`    结束日期: ${info.endDate ? info.endDate.toISOString().substring(0, 10) : 'NULL'}`);
    console.log(`    isCurrent: ${info.isCurrent}`);
    console.log(`    职位: ${info.position || 'NULL'}`);
    console.log(`    职级: ${info.jobLevel || 'NULL'}`);
    console.log(`    创建时间: ${info.createdAt.toISOString().substring(0, 19)}`);
    console.log(`    更新时间: ${info.updatedAt.toISOString().substring(0, 19)}`);
    console.log('');
  });

  // 3. 查询所有劳动力账户
  console.log('3. 查询所有劳动力账户：');
  const laborAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      path: true,
      namePath: true,
      effectiveDate: true,
      expiryDate: true,
      createdAt: true,
      updatedAt: true,
      hierarchyValues: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`  找到 ${laborAccounts.length} 个账户\n`);

  if (laborAccounts.length === 0) {
    console.log('  ❌ 没有劳动力账户');
    await prisma.$disconnect();
    return;
  }

  laborAccounts.forEach((account, idx) => {
    console.log(`  账户 ${idx + 1} (ID: ${account.id}):`);
    console.log(`    code: ${account.code}`);
    console.log(`    type: ${account.type}`);
    console.log(`    status: ${account.status}`);
    console.log(`    生效日期: ${account.effectiveDate ? account.effectiveDate.toISOString().substring(0, 10) : 'NULL'}`);
    console.log(`    失效日期: ${account.expiryDate ? account.expiryDate.toISOString().substring(0, 10) : 'NULL'}`);
    console.log(`    创建时间: ${account.createdAt.toISOString().substring(0, 19)}`);
    console.log(`    更新时间: ${account.updatedAt.toISOString().substring(0, 19)}`);
    console.log(`    path: ${account.path}`);
    console.log(`    namePath: ${account.namePath || 'NULL'}`);

    if (account.hierarchyValues) {
      try {
        const hv = JSON.parse(account.hierarchyValues);
        const nonNullCount = hv.filter((level: any) => level.selectedValue).length;
        console.log(`    hierarchyValues: ${nonNullCount}/${hv.length} 层有值`);

        // 显示Level 6-7的详细情况
        const level6 = hv.find((level: any) => level.level === 6);
        const level7 = hv.find((level: any) => level.level === 7);

        console.log(`      Level 6 (岗位): ${level6?.selectedValue ? JSON.stringify(level6.selectedValue) : 'NULL'}`);
        console.log(`      Level 7 (职级): ${level7?.selectedValue ? JSON.stringify(level7.selectedValue) : 'NULL'}`);
      } catch (e) {
        console.log('    hierarchyValues: 解析失败');
      }
    }
    console.log('');
  });

  // 4. 检查最新的主账户
  console.log('4. 检查最新的主账户（MAIN类型）：');
  const mainAccounts = laborAccounts.filter(acc => acc.type === 'MAIN');
  console.log(`  主账户数: ${mainAccounts.length}`);

  const activeMainAccounts = mainAccounts.filter(acc => acc.status === 'ACTIVE');
  const inactiveMainAccounts = mainAccounts.filter(acc => acc.status === 'INACTIVE');

  console.log(`  ACTIVE主账户: ${activeMainAccounts.length}`);
  console.log(`  INACTIVE主账户: ${inactiveMainAccounts.length}`);
  console.log('');

  // 5. 检查账户更新时间 vs 工作信息更新时间
  if (workInfoHistory.length > 0 && laborAccounts.length > 0) {
    const latestWorkInfo = workInfoHistory[0];
    const latestAccount = laborAccounts[laborAccounts.length - 1];

    console.log('5. 时间对比分析：');
    console.log(`  最新WorkInfoHistory更新时间: ${latestWorkInfo.updatedAt.toISOString().substring(0, 19)}`);
    console.log(`  最新账户创建时间: ${latestAccount.createdAt.toISOString().substring(0, 19)}`);
    console.log(`  最新账户更新时间: ${latestAccount.updatedAt.toISOString().substring(0, 19)}`);

    if (latestAccount.createdAt > latestWorkInfo.updatedAt) {
      console.log('  ⚠️ 账户是在工作信息更新之后创建的');
    } else if (latestAccount.updatedAt > latestWorkInfo.updatedAt) {
      console.log('  ⚠️ 账户是在工作信息更新之后更新的');
    }
    console.log('');
  }

  // 6. 总结问题
  console.log('=== 问题分析 ===\n');

  if (laborAccounts.length > 1) {
    console.log(`问题1: 有 ${laborAccounts.length} 个账户版本`);
    console.log('  - 每次重新生成都创建新账户，导致账户数量过多');
    console.log('  - 应该修改现有账户而不是创建新账户');
  }

  const latestAccount = laborAccounts[laborAccounts.length - 1];
  if (latestAccount && latestAccount.hierarchyValues) {
    try {
      const hv = JSON.parse(latestAccount.hierarchyValues);
      const level6 = hv.find((level: any) => level.level === 6);
      const level7 = hv.find((level: any) => level.level === 7);

      if (!level6?.selectedValue || !level7?.selectedValue) {
        console.log('\\n问题2: 最新账户的层级值为NULL');
        console.log('  - WorkInfoHistory有数据:');
        if (workInfoHistory.length > 0) {
          console.log(`    position: ${workInfoHistory[0].position || 'NULL'}`);
          console.log(`    jobLevel: ${workInfoHistory[0].jobLevel || 'NULL'}`);
        }
        console.log('  - 但账户hierarchyValues为NULL');
        console.log('  - 说明账户生成逻辑没有正确从WorkInfoHistory读取数据');
      }
    } catch (e) {
      console.log('解析hierarchyValues失败:', e);
    }
  }

  await prisma.$disconnect();
}

diagnoseEmployee202605014()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
