import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 验证 Paul 的账户匹配逻辑 ===\n');

  // 获取 Paul 的账户
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202605002' }
  });

  if (!employee) {
    console.log('未找到员工');
    return;
  }

  const employeeAccounts = await prisma.employeeLaborAccount.findMany({
    where: { employeeId: employee.id },
    include: {
      account: true
    }
  });

  if (employeeAccounts.length === 0) {
    console.log('未找到账户');
    return;
  }

  const account = employeeAccounts[0].account;
  console.log(`测试账户: ${account.name}`);
  console.log(`层级: ${account.level}`);
  console.log(`层级值: ${account.hierarchyValues}\n`);

  const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];

  // 获取所有计算出勤代码
  const calcCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
      calculateHours: true
    },
    orderBy: { code: 'asc' }
  });

  console.log(`测试 ${calcCodes.length} 个计算出勤代码:\n`);

  calcCodes.forEach(code => {
    console.log(`--- ${code.code} (${code.name}) ---`);
    console.log(`类型: ${code.type}`);
    console.log(`账户层级配置: ${code.accountLevels}`);

    // 复制 isAccountMatch 逻辑
    const accountLevels = JSON.parse(code.accountLevels || '[]');
    let match = false;

    if (accountLevels.length === 0) {
      match = true;
      console.log(`✅ 匹配 (accountLevels为空，匹配所有账户)`);
    } else {
      const levelsToCheck = accountLevels.map((v: number) => v + 1);
      console.log(`需要检查层级: ${levelsToCheck.join(', ')}`);

      const missingLevels = [];
      for (const sortValue of accountLevels) {
        const level = sortValue + 1;
        const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

        if (!levelConfig || !levelConfig.selectedValue) {
          missingLevels.push(level);
        }
      }

      if (missingLevels.length > 0) {
        match = false;
        console.log(`❌ 不匹配 (缺少层级: ${missingLevels.join(', ')})`);
      } else {
        match = true;
        console.log(`✅ 匹配 (所有需要的层级都有值)`);
      }
    }

    console.log('');
  });

  console.log('\n=== 总结 ===');
  console.log('根据上述匹配逻辑：');
  console.log('- AC_001 (线体工时) [0,1,2]: 需要层级1,2,3 -> 应该匹配 ✅');
  console.log('- AC_003 (工序工时) [0,1,2,4]: 需要层级1,2,3,5 -> 层级5为null -> 应该不匹配 ❌');
  console.log('- AC_004 (出勤工时) []: accountLevels为空 -> 匹配所有 ✅');
  console.log('');
  console.log('但实际计算结果中有 AC_003，说明：');
  console.log('1. 可能账户合并后层级5有值');
  console.log('2. 或者计算时使用了不同的账户');
  console.log('3. 或者 isAccountMatch 逻辑有bug');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
