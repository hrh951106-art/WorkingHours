import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeAccountCreationLogic() {
  console.log('=== 分析主劳动力账户创建逻辑 ===\n');

  // 1. 查看WorkInfoHistory表结构，理解"任职记录版本"的概念
  console.log('1. WorkInfoHistory（任职记录）表结构分析：\n');

  const workInfoHistory = await prisma.workInfoHistory.findMany({
    select: {
      id: true,
      employeeId: true,
      effectiveDate: true,
      endDate: true,
      position: true,
      jobLevel: true,
      isCurrent: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { employeeId: 'asc', effectiveDate: 'desc' },
    take: 10,
  });

  console.log('任职记录示例：');
  workInfoHistory.forEach((wh) => {
    console.log(`  ID: ${wh.id}, EmployeeID: ${wh.employeeId}, 生效日期: ${wh.effectiveDate.toISOString().substring(0, 10)}, isCurrent: ${wh.isCurrent}`);
  });

  // 2. 分析202605014的任职记录和账户关系
  console.log('\n2. 分析202605014的任职记录和账户关系：\n');

  const employee = await prisma.employee.findFirst({
    where: { employeeNo: '202605014' },
    select: { id: true, name: true },
  });

  if (employee) {
    const employeeWorkInfo = await prisma.workInfoHistory.findMany({
      where: { employeeId: employee.id },
      orderBy: { effectiveDate: 'desc' },
      select: {
        id: true,
        effectiveDate: true,
        position: true,
        jobLevel: true,
        isCurrent: true,
      },
    });

    console.log(`任职记录数: ${employeeWorkInfo.length}`);
    employeeWorkInfo.forEach((wh) => {
      console.log(`  记录${wh.id}: ${wh.effectiveDate.toISOString().substring(0, 10)} 生效, position=${wh.position}, jobLevel=${wh.jobLevel}, isCurrent=${wh.isCurrent}`);
    });

    const employeeAccounts = await prisma.laborAccount.findMany({
      where: { employeeId: employee.id, type: 'MAIN' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        code: true,
        status: true,
        effectiveDate: true,
        createdAt: true,
        hierarchyValues: true,
      },
    });

    console.log(`\n主账户数: ${employeeAccounts.length}`);
    employeeAccounts.forEach((acc) => {
      console.log(`  账户${acc.id}: 创建于${acc.createdAt.toISOString().substring(0, 19)}, ${acc.status}, 生效${acc.effectiveDate ? acc.effectiveDate.toISOString().substring(0, 10) : 'NULL'}`);
      if (acc.hierarchyValues) {
        try {
          const hv = JSON.parse(acc.hierarchyValues);
          const level7 = hv.find((level: any) => level.level === 7);
          if (level7?.selectedValue) {
            console.log(`    Level 7: ${level7.selectedValue.code}`);
          }
        } catch (e) {}
      }
    });
  }

  // 3. 总结当前问题
  console.log('\n=== 当前问题分析 ===\n');

  console.log('问题1: 账户创建与任职记录不同步');
  console.log('  - 期望：1条任职记录 → 1个主账户（同一版本）');
  console.log('  - 实际：每次regenerate都创建新账户');

  console.log('\n问题2: 账户更新逻辑错误');
  console.log('  - 期望：更新任职记录 → 更新对应账户的hierarchyValues');
  console.log('  - 实际：更新任职记录 → 重新生成 → 创建新账户');

  console.log('\n问题3: 缺少任职记录与账户的关联');
  console.log('  - 期望：账户应该关联到对应的任职记录ID');
  console.log('  - 实际：账户没有字段记录对应哪条任职记录');

  await prisma.$disconnect();
}

analyzeAccountCreationLogic()
  .then(() => {
    console.log('\n分析完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('分析失败:', error);
    process.exit(1);
  });
