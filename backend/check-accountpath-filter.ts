import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 详细检查账户路径筛选 ==========\n');

  const recordDate = new Date('2026-05-19');
  recordDate.setHours(0, 0, 0, 0);

  // 1. 获取账户113
  const account = await prisma.laborAccount.findUnique({
    where: { id: 113 }
  });

  console.log('【账户113信息】');
  console.log(`  路径: ${account?.path || account?.namePath}`);

  // 2. 构建路径集合
  const accountPaths = new Set<string>();
  if (account?.path) {
    accountPaths.add(account.path);
    const pathSegments = account.path.split('/');
    for (let i = 1; i < pathSegments.length; i++) {
      accountPaths.add(pathSegments.slice(0, i + 1).join('/'));
    }
  }

  console.log(`\n【账户路径集合】`);
  console.log(`  共${accountPaths.size}个路径:`);
  for (const path of accountPaths) {
    console.log(`    - ${path}`);
  }

  // 3. 查询工时结果
  console.log('\n【逐步测试查询条件】\n');

  // 测试1：只用日期和考勤代码
  const test1 = await prisma.workHourResult.findMany({
    where: {
      workDate: recordDate,
      status: 'ACTIVE',
      attendanceCode: 'A06'
    }
  });
  console.log(`测试1 - 只用日期+考勤代码: ${test1.length}条`);

  // 测试2：加上账户路径筛选
  const test2 = await prisma.workHourResult.findMany({
    where: {
      workDate: recordDate,
      status: 'ACTIVE',
      attendanceCode: 'A06',
      accountPath: { in: Array.from(accountPaths) }
    }
  });
  console.log(`测试2 - 加上账户路径筛选: ${test2.length}条`);

  // 测试3：显示工时结果的实际账户路径
  console.log('\n【工时结果的实际账户路径】\n');
  const allResults = await prisma.workHourResult.findMany({
    where: {
      workDate: recordDate,
      status: 'ACTIVE',
      attendanceCode: 'A06'
    },
    select: {
      employeeNo: true,
      accountPath: true,
      accountId: true
    }
  });

  const actualPaths = new Set<string>();
  for (const r of allResults) {
    if (r.accountPath) {
      actualPaths.add(r.accountPath);
    }
    console.log(`  员工${r.employeeNo}: accountPath="${r.accountPath}", accountId=${r.accountId}`);
  }

  console.log(`\n工时结果中的账户路径:`);
  for (const path of actualPaths) {
    const isInAccountPaths = accountPaths.has(path);
    console.log(`  "${path}" ${isInAccountPaths ? '✅ 在账户路径集合中' : '❌ 不在账户路径集合中'}`);
  }

  // 4. 检查是否匹配
  console.log('\n【匹配检查】\n');
  const hasMatch = Array.from(actualPaths).some(path => accountPaths.has(path));
  console.log(`工时结果路径与账户路径是否有交集: ${hasMatch ? '✅ 是' : '❌ 否'}`);

  if (!hasMatch) {
    console.log('\n❌ 问题找到了！');
    console.log('   工时结果的账户路径不在账户的路径集合中');
    console.log('   导致筛选时被过滤掉了');
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
