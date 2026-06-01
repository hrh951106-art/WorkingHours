import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseWangZhiqiangAccount() {
  const employeeNo = '202605013';
  console.log(`=== 排查员工 ${employeeNo} (王志强) ��户层级问题 ===\n`);

  // 1. 查询员工基本信息
  console.log('1. 查询员工基本信息：');
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: {
      id: true,
      employeeNo: true,
      name: true,
      orgId: true,
    },
  });

  if (!employee) {
    console.log('未找到员工');
    return;
  }

  console.log(`  员工ID: ${employee.id}`);
  console.log(`  员工号: ${employee.employeeNo}`);
  console.log(`  姓名: ${employee.name}`);
  console.log(`  组织ID: ${employee.orgId}`);
  console.log('');

  // 2. 查询员工的劳动力账户
  console.log('2. 查询员工的劳动力账户：');
  const laborAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      name: true,
      code: true,
      path: true,
      hierarchyValues: true,
      status: true,
    },
  });

  console.log(`  找到 ${laborAccounts.length} 个劳动力账户\n`);

  if (laborAccounts.length === 0) {
    console.log('  ❌ 员工没有劳动力账户');
    return;
  }

  const mainAccount = laborAccounts[0];
  console.log(`  主账户ID: ${mainAccount.id}`);
  console.log(`  主账户名称: ${mainAccount.name}`);
  console.log(`  主账户编码: ${mainAccount.code}`);
  console.log(`  主账户路径: ${mainAccount.path}`);
  console.log(`  主账户状态: ${mainAccount.status}`);
  console.log('');

  if (mainAccount.hierarchyValues) {
    try {
      const hierarchyValues = JSON.parse(mainAccount.hierarchyValues);
      console.log('  主账户层级详情：');
      hierarchyValues.forEach((hv: any) => {
        const hasValue = hv.selectedValue ? '✅' : '❌';
        const valueStr = hv.selectedValue ? JSON.stringify(hv.selectedValue) : 'NULL';
        console.log(`    ${hasValue} Level ${hv.level} (${hv.name}): ${valueStr}`);
      });
      console.log('');
    } catch (e) {
      console.log('  解析hierarchyValues失败:', e);
    }
  }

  // 3. 查询工时记录
  console.log('3. 查询最近的工时记录：');
  const workHourResults = await prisma.workHourResult.findFirst({
    where: { employeeNo },
    orderBy: { workDate: 'desc' },
    select: {
      id: true,
      employeeNo: true,
      accountId: true,
      accountName: true,
      accountPath: true,
      workDate: true,
    },
  });

  if (workHourResults) {
    console.log(`  工时记录ID: ${workHourResults.id}`);
    console.log(`  工时日期: ${workHourResults.workDate}`);
    console.log(`  工时账户ID: ${workHourResults.accountId}`);
    console.log(`  工时账户名称: ${workHourResults.accountName}`);
    console.log(`  工时账户路径: ${workHourResults.accountPath}`);
    console.log('');

    const workHourAccount = await prisma.laborAccount.findFirst({
      where: { id: workHourResults.accountId },
      select: {
        id: true,
        name: true,
        hierarchyValues: true,
      },
    });

    if (workHourAccount && workHourAccount.hierarchyValues) {
      try {
        const hierarchyValues = JSON.parse(workHourAccount.hierarchyValues);
        console.log('  工时账户层级详情：');
        hierarchyValues.forEach((hv: any) => {
          const hasValue = hv.selectedValue ? '✅' : '❌';
          const valueStr = hv.selectedValue ? JSON.stringify(hv.selectedValue) : 'NULL';
          console.log(`    ${hasValue} Level ${hv.level} (${hv.name}): ${valueStr}`);
        });
        console.log('');
      } catch (e) {
        console.log('  解析失败:', e);
      }
    }
  } else {
    console.log('  未找到工时记录');
    console.log('');
  }

  // 4. 对比其他员工
  console.log('4. 对比其他员工的账户（7层完整）：');
  const otherResult = await prisma.earnedHoursAllocationResult.findFirst({
    where: {
      batchNo: 'EHA-1780276636696-3llr2x',
      sourceEmployeeNo: { not: employeeNo },
    },
  });

  if (otherResult) {
    console.log(`  对比员工: ${otherResult.sourceEmployeeNo}`);
    console.log(`  sourceAccountName: ${otherResult.sourceAccountName}`);
    console.log(`  targetAccountName: ${otherResult.targetAccountName}`);
    console.log('');

    const otherEmployee = await prisma.employee.findFirst({
      where: { employeeNo: otherResult.sourceEmployeeNo },
      select: { id: true },
    });

    if (otherEmployee) {
      const otherMainAccount = await prisma.laborAccount.findFirst({
        where: { employeeId: otherEmployee.id },
        select: { hierarchyValues: true },
      });

      if (otherMainAccount && otherMainAccount.hierarchyValues) {
        try {
          const hierarchyValues = JSON.parse(otherMainAccount.hierarchyValues);
          console.log('  对比员工主账户层级：');
          hierarchyValues.forEach((hv: any) => {
            const hasValue = hv.selectedValue ? '✅' : '❌';
            const valueStr = hv.selectedValue ? JSON.stringify(hv.selectedValue) : 'NULL';
            console.log(`    ${hasValue} Level ${hv.level} (${hv.name}): ${valueStr}`);
          });
        } catch (e) {
          console.log('  解析失败:', e);
        }
      }
    }
  }

  // 5. 检查工作信息历史
  console.log('\n5. 检查员工的工作信息历史：');
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    take: 3,
  });

  console.log(`  找到 ${workInfoHistory.length} 条工作信息记录\n`);
  workInfoHistory.forEach((info, idx) => {
    console.log(`  记录 ${idx + 1}:`);
    console.log(`    生效日期: ${info.effectiveDate}`);
    console.log(`    职位: ${info.position || 'NULL'}`);
    console.log(`    技能等级: ${info.skillLevel || 'NULL'}`);
    console.log('');
  });

  // 6. 总结问题
  console.log('=== 问题分析总结 ===\n');

  if (mainAccount && mainAccount.hierarchyValues) {
    const hierarchyValues = JSON.parse(mainAccount.hierarchyValues);
    const levelsWithValues = hierarchyValues.filter((hv: any) => hv.selectedValue).length;
    const totalLevels = hierarchyValues.length;

    console.log(`主账户层级统计：`);
    console.log(`  总层级数: ${totalLevels}`);
    console.log(`  有值的层级: ${levelsWithValues}`);
    console.log(`  缺失层级: ${totalLevels - levelsWithValues}`);

    const missingLevels = hierarchyValues.filter((hv: any) => !hv.selectedValue);
    if (missingLevels.length > 0) {
      console.log(`\n缺失的层级：`);
      missingLevels.forEach((hv: any) => {
        console.log(`  Level ${hv.level} (${hv.name}): 没有值`);
      });
    }
  }

  console.log('\n可能的原因：');
  console.log('1. 主账户创建时，员工的position或skillLevel字段为空');
  console.log('2. WorkInfoHistory中最新记录的position或skillLevel为NULL');
  console.log('3. 劳动力账户的hierarchyValues中Level 6-7的selectedValue为null');
  console.log('4. 账户合并逻辑中，工时账户覆盖了主账户的后两层（如果工时账户也没有这些值）');
}

diagnoseWangZhiqiangAccount()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
