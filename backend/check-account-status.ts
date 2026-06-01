import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查账户113的状态和筛选逻辑 ==========\n');

  // 1. 检查账户113的状态
  console.log('【1. 账户113的基本信息】\n');
  const account113 = await prisma.laborAccount.findUnique({
    where: { id: 113 }
  });

  if (account113) {
    console.log(`ID: ${account113.id}`);
    console.log(`代码: ${account113.code}`);
    console.log(`名称: ${account113.name}`);
    console.log(`状态: ${account113.status}`);
    console.log(`类型: ${account113.type}`);
    console.log(`路径: ${account113.path || account113.namePath}`);
    console.log(`组织ID: ${account113.orgId}`);
    console.log(`员工ID: ${account113.employeeId}`);
  } else {
    console.log('❌ 账户113不存在！');
    return;
  }

  // 2. 检查账户113的层级配置
  console.log('\n【2. 账户113的层级配置】\n');
  if (account113?.hierarchyValues) {
    const hierarchyValues = JSON.parse(account113.hierarchyValues);
    console.log('层级值数量:', hierarchyValues.length);
    hierarchyValues.forEach((hv: any, idx: number) => {
      console.log(`  层级${idx + 1}:`);
      console.log(`    层级: ${hv.level}`);
      console.log(`    层级名称: ${hv.levelName}`);
      console.log(`    选择值: ${JSON.stringify(hv.selectedValue)}`);
    });
  } else {
    console.log('❌ 账户113没有hierarchyValues！');
  }

  // 3. 检查A01配置的账户筛选条件
  console.log('\n【3. A01配置的账户筛选条件】\n');
  const a01Config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: { code: 'A01' }
  });

  if (a01Config) {
    const sourceConfig = JSON.parse(a01Config.sourceConfig || '{}');
    console.log('来源配置:', JSON.stringify(sourceConfig, null, 2));

    if (sourceConfig.accountFilter?.hierarchySelections) {
      console.log('\n层级筛选条件:');
      for (const selection of sourceConfig.accountFilter.hierarchySelections) {
        console.log(`  层级${selection.level} (${selection.levelName}):`);
        console.log(`    要求的值: ${JSON.stringify(selection.valueIds)}`);
      }
    }
  }

  // 4. 检查账户113是否满足A01的筛选条件
  console.log('\n【4. 账户113是否满足A01筛选条件】\n');
  if (a01Config && account113?.hierarchyValues) {
    const sourceConfig = JSON.parse(a01Config.sourceConfig || '{}');
    const accountHierarchy = JSON.parse(account113.hierarchyValues);

    if (sourceConfig.accountFilter?.hierarchySelections) {
      let allMatch = true;
      for (const selection of sourceConfig.accountFilter.hierarchySelections) {
        // 找到账户对应层级的值
        const accountLevelValue = accountHierarchy.find((hv: any) => hv.level === selection.level);

        if (accountLevelValue) {
          const selectedValueCode = accountLevelValue.selectedValue?.code;
          const isMatch = selection.valueIds.includes(selectedValueCode);

          console.log(`  层级${selection.level} (${selection.levelName}):`);
          console.log(`    账户值: ${selectedValueCode}`);
          console.log(`    要求值: ${selection.valueIds.join(', ')}`);
          console.log(`    匹配: ${isMatch ? '✅ 是' : '❌ 否'}`);

          if (!isMatch) {
            allMatch = false;
          }
        } else {
          console.log(`  层级${selection.level}: 账户没有此层级配置 ❌`);
          allMatch = false;
        }
      }

      console.log(`\n  总体匹配: ${allMatch ? '✅ 满足筛选条件' : '❌ 不满足筛选条件'}`);
    }
  }

  // 5. 检查工时结果
  console.log('\n【5. 5月19日的工时结果】\n');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      calcDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    }
  });

  console.log(`工时结果数量: ${workHourResults.length}`);
  console.log(`涉及的账户ID: ${[...new Set(workHourResults.map(wh => wh.accountId))].join(', ')}`);
  console.log(`涉及的账户路径: ${[...new Set(workHourResults.map(wh => wh.accountPath))].join(', ')}`);

  // 6. 模拟分摊计算的筛选逻辑
  console.log('\n【6. 模拟分摊计算筛选】\n');

  // Step 1: getLineLaborAccounts(record.orgId=113)
  console.log('Step 1: getLineLaborAccounts(orgId=113)');
  const lineAccount = await prisma.laborAccount.findFirst({
    where: {
      id: 113,
      status: 'ACTIVE'
    }
  });
  console.log(`  结果: ${lineAccount ? '✅ 找到活跃账户' : '❌ 未找到活跃账户'}`);
  if (lineAccount) {
    console.log(`  账户: ${lineAccount.name} (${lineAccount.code})`);
  }

  // Step 2: filterAccountsByWorkHours
  console.log('\nStep 2: filterAccountsByWorkHours');
  if (lineAccount && a01Config) {
    const sourceConfig = JSON.parse(a01Config.sourceConfig || '{}');

    if (sourceConfig.accountFilter?.hierarchySelections) {
      console.log('  需要检查账户层级筛选条件...');

      // 模拟筛选逻辑
      let passed = true;
      const hierarchyValues = lineAccount.hierarchyValues ? JSON.parse(lineAccount.hierarchyValues) : [];

      for (const selection of sourceConfig.accountFilter.hierarchySelections) {
        const accountLevelValue = hierarchyValues.find((hv: any) => hv.level === selection.level);
        if (!accountLevelValue || !selection.valueIds.includes(accountLevelValue.selectedValue?.code)) {
          passed = false;
          console.log(`  ❌ 层级${selection.level}筛选失败`);
        }
      }

      console.log(`  筛选结果: ${passed ? '✅ 通过筛选' : '❌ 未通过筛选'}`);

      if (!passed) {
        console.log('\n❌ 这是导致没有分摊结果的根本原因！');
        console.log('   账户113被层级筛选条件过滤掉了');
      }
    }
  }

  // Step 3: getEmployeesWithHours
  console.log('\nStep 3: getEmployeesWithHours');
  console.log('  如果账户通过了筛选，会查询工时结果');
  console.log('  查询条件: accountPath IN (账户113的路径及其父路径)');
  console.log(`  账户113的路径: ${lineAccount?.path || lineAccount?.namePath}`);

  // 计算所有父路径
  if (lineAccount?.path) {
    const allPaths = [lineAccount.path];
    const segments = lineAccount.path.split('/');
    for (let i = 1; i < segments.length; i++) {
      allPaths.push(segments.slice(0, i + 1).join('/'));
    }
    console.log(`  所有匹配路径: ${allPaths.join(', ')}`);

    // 查看工时结果的账户路径是否在其中
    const workHourPaths = [...new Set(workHourResults.map(wh => wh.accountPath))];
    console.log(`\n  工时结果账户路径: ${workHourPaths.join(', ')}`);

    for (const whPath of workHourPaths) {
      const isMatch = allPaths.includes(whPath);
      console.log(`    ${whPath} ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
    }
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
