import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFix() {
  const employeeNo = '202605013';
  console.log(`=== 验证修复结果：员工 ${employeeNo} ===\n`);

  // 1. 检查账户162的层级
  const account = await prisma.laborAccount.findFirst({
    where: { id: 162 },
    select: { hierarchyValues: true },
  });

  if (account && account.hierarchyValues) {
    const hv = JSON.parse(account.hierarchyValues);
    console.log('账户162层级详情：');
    hv.forEach((level: any) => {
      const hasValue = level.selectedValue ? '✅' : '❌';
      const valueStr = level.selectedValue ? level.selectedValue.name || level.selectedValue.code : 'NULL';
      console.log(`  ${hasValue} Level ${level.level}: ${valueStr}`);
    });

    const path = hv
      .filter((v: any) => v.selectedValue)
      .map((v: any) => v.selectedValueLabel || v.selectedValue?.name)
      .join('/');
    console.log(`\n完整路径: ${path}\n`);
  }

  // 2. 查询最新的分摊结果
  const latestAllocation = await prisma.earnedHoursAllocationResult.findFirst({
    where: { sourceEmployeeNo: employeeNo },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      batchNo: true,
      sourceAccountName: true,
      targetAccountName: true,
      sourceHours: true,
      allocatedHours: true,
      createdAt: true,
    },
  });

  if (latestAllocation) {
    console.log('最新分摊结果：');
    console.log(`  批次号: ${latestAllocation.batchNo}`);
    console.log(`  时间: ${latestAllocation.createdAt.toISOString().substring(0, 19)}`);
    console.log(`  源账户名称: ${latestAllocation.sourceAccountName}`);
    console.log(`  目标账户名称: ${latestAllocation.targetAccountName}`);
    console.log(`  源工时: ${latestAllocation.sourceHours}`);
    console.log(`  分摊工时: ${latestAllocation.allocatedHours}`);
    console.log('');

    // 分析账户名称
    const hasPosition = latestAllocation.sourceAccountName?.includes('焊接岗位');
    const hasSkillLevel = latestAllocation.sourceAccountName?.includes('五类二级');

    console.log(`  包含岗位: ${hasPosition ? '✅' : '❌'}`);
    console.log(`  包含技能等级: ${hasSkillLevel ? '✅' : '❌'}`);
  } else {
    console.log('未找到分摊结果（需要重新运行分摊才能看到效果）');
  }

  console.log('\n=== 验证结论 ===');

  if (account?.hierarchyValues) {
    const hv = JSON.parse(account.hierarchyValues);
    const hasLevel6 = hv.some((level: any) => level.level === 6 && level.selectedValue);
    const hasLevel7 = hv.some((level: any) => level.level === 7 && level.selectedValue);

    if (hasLevel6 && hasLevel7) {
      console.log('✅ 账户162已包含岗位和技能等级层级');
      console.log('✅ 修复成功！');
    } else {
      console.log('❌ 账户162仍缺少岗位或技能等级层级');
    }
  }

  await prisma.$disconnect();
}

verifyFix()
  .then(() => {
    console.log('\n验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证失败:', error);
    process.exit(1);
  });
