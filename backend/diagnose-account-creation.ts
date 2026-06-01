import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseAccountCreation() {
  const employeeNo = '202605013';
  console.log(`=== 排查员工 ${employeeNo} 账户创建问题 ===\n`);

  // 1. 查询员工的所有账户
  console.log('1. 查询员工的所有劳动力账户（按创建时间排序）：');
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('未找到员工');
    return;
  }

  const allAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      hierarchyValues: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`找到 ${allAccounts.length} 个账户\n`);

  allAccounts.forEach((account, idx) => {
    console.log(`账户 ${idx + 1} (ID: ${account.id}):`);
    console.log(`  创建时间: ${account.createdAt.toISOString().substring(0, 19)}`);
    console.log(`  更新时间: ${account.updatedAt.toISOString().substring(0, 19)}`);
    console.log(`  状态: ${account.status}`);
    console.log(`  编码: ${account.code}`);

    if (account.hierarchyValues) {
      try {
        const hv = JSON.parse(account.hierarchyValues);
        const hasLevel6 = hv.some((level: any) => level.level === 6 && level.selectedValue);
        const hasLevel7 = hv.some((level: any) => level.level === 7 && level.selectedValue);
        console.log(`  Level 6 (岗位): ${hasLevel6 ? '✅ 有值' : '❌ NULL'}`);
        console.log(`  Level 7 (技能等级): ${hasLevel7 ? '✅ 有值' : '❌ NULL'}`);

        if (hasLevel6 || hasLevel7) {
          console.log('  详细层级值：');
          hv.forEach((level: any) => {
            if (level.level >= 6 && level.selectedValue) {
              console.log(`    Level ${level.level}: ${JSON.stringify(level.selectedValue)}`);
            }
          });
        }
      } catch (e) {
        console.log('  解析失败');
      }
    }
    console.log('');
  });

  // 2. 查询WorkInfoHistory（工作信息历史）
  console.log('2. 查询WorkInfoHistory（岗位和职级的源头）：');
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    select: {
      id: true,
      effectiveDate: true,
      endDate: true,
      position: true,
    },
  });

  console.log(`找到 ${workInfoHistory.length} 条记录\n`);

  workInfoHistory.forEach((info, idx) => {
    console.log(`记录 ${idx + 1} (ID: ${info.id}):`);
    console.log(`  生效日期: ${info.effectiveDate.toISOString().substring(0, 10)}`);
    console.log(`  结束日期: ${info.endDate ? info.endDate.toISOString().substring(0, 10) : 'NULL'}`);
    console.log(`  职位: ${info.position || 'NULL'}`);
    console.log('');
  });

  // 3. 分析账户创建时间和WorkInfoHistory的关系
  console.log('3. 分析账户创建时间和WorkInfoHistory的对应关系：\n');

  if (workInfoHistory.length > 0) {
    const latestWorkInfo = workInfoHistory[0];
    console.log(`最新WorkInfoHistory生效时间: ${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}\n`);

    allAccounts.forEach((account, idx) => {
      const accountCreated = account.createdAt.toISOString().substring(0, 10);
      const isAfterWorkInfo = account.createdAt >= latestWorkInfo.effectiveDate;
      const relation = isAfterWorkInfo ? '之后' : '之前';
      console.log(`账户${idx + 1} (ID: ${account.id}) 创建于 ${accountCreated} (${relation}WorkInfoHistory)`);
    });
    console.log('');
  }

  // 4. 查询工时记录（看看账户是如何关联的）
  console.log('4. 查询最近的工时记录（查看关联的账户ID）：');
  const workHourResults = await prisma.workHourResult.findMany({
    where: { employeeNo },
    orderBy: { workDate: 'desc' },
    take: 5,
    select: {
      id: true,
      workDate: true,
      accountId: true,
      accountName: true,
      source: true,
      createdAt: true,
    },
  });

  console.log(`找到 ${workHourResults.length} 条工时记录\n`);
  workHourResults.forEach((result, idx) => {
    console.log(`记录 ${idx + 1}:`);
    console.log(`  工作日期: ${result.workDate.toISOString().substring(0, 10)}`);
    console.log(`  账户ID: ${result.accountId}`);
    console.log(`  账户名称: ${result.accountName}`);
    console.log(`  来源: ${result.source}`);
    console.log(`  创建时间: ${result.createdAt.toISOString().substring(0, 19)}`);
    console.log('');
  });

  // 5. 查找账户104、111、120、155、162的创建来源
  console.log('5. 查找空账户的创建来源（通过时间关联）：\n');

  const emptyAccounts = allAccounts.filter(a => {
    if (!a.hierarchyValues) return true;
    try {
      const hv = JSON.parse(a.hierarchyValues);
      return !hv.some((level: any) => level.selectedValue);
    } catch {
      return true;
    }
  });

  console.log(`发现 ${emptyAccounts.length} 个空账户\n`);

  emptyAccounts.forEach((account, idx) => {
    console.log(`空账户 ${idx + 1} (ID: ${account.id}):`);
    console.log(`  创建时间: ${account.createdAt.toISOString().substring(0, 19)}`);
    console.log(`  编码: ${account.code}`);

    // 查找相近时间的工时记录或表单
    const nearbyWorkHour = workHourResults.find(wh => {
      const timeDiff = Math.abs(wh.createdAt.getTime() - account.createdAt.getTime());
      return timeDiff < 60000; // 1分钟内
    });

    if (nearbyWorkHour) {
      console.log(`  关联工时记录: ID=${nearbyWorkHour.id}, 来源=${nearbyWorkHour.source}`);
    }
    console.log('');
  });

  // 6. 总结问题
  console.log('=== 问题分析总结 ===\n');

  if (allAccounts.length > 0) {
    const firstAccount = allAccounts[0];
    const lastAccount = allAccounts[allAccounts.length - 1];

    console.log('账户演变时间线：');
    allAccounts.forEach((account, idx) => {
      const hasValues = account.hierarchyValues && JSON.parse(account.hierarchyValues).some((v: any) => v.selectedValue);
      const status = hasValues ? '✅有值' : '❌空';
      console.log(`  ${account.createdAt.toISOString().substring(0, 19)} 账户${account.id} (${status})`);
    });
    console.log('');

    console.log('关键发现：');
    console.log('1. 账户97: 最早创建，有完整的层级值（包括岗位和技能等级）');
    console.log('2. 账户104-162: 后续创建，层级值全部为NULL');
    console.log('3. 最新ACTIVE账户162: 层级值为NULL，导致分摊结果缺少岗位和技能等级');
    console.log('');
  }

  if (workInfoHistory.length > 0) {
    const latestWorkInfo = workInfoHistory[0];
    console.log('WorkInfoHistory状态：');
    console.log(`  最新记录生效日期: ${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}`);
    console.log(`  职位: ${latestWorkInfo.position || 'NULL'}`);
    console.log(`  技能等级: ${latestWorkInfo.skillLevel || 'NULL'}`);
    console.log('');
  }

  console.log('可能的原因：');
  console.log('1. 工时汇报/岗位变更时创建了新的劳动力账户');
  console.log('2. 新账户创建逻辑没有从WorkInfoHistory获取岗位和技能等级');
  console.log('3. 或者账户创建时WorkInfoHistory的岗位/技能等级为NULL（后来才更新）');
  console.log('4. 新账户的hierarchyValues初始化为空数组，没有复制旧账户的值');
}

diagnoseAccountCreation()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
