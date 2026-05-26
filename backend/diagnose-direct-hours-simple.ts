import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseDirectHoursIssue() {
  console.log('=== A06分摊规则直接工时问题诊断 ===\n');

  // 1. 获取通用配置和直接工时代码
  console.log('1. 检查直接工时配置:');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  const actualHoursCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: generalConfig?.actualHoursAllocationCode || 'A01' }
  });

  console.log(`  直接工时代码: ${generalConfig?.actualHoursAllocationCode}`);
  console.log(`  直接工时出勤代码ID: ${actualHoursCode?.id}\n`);

  // 2. 查询直接工时数据
  console.log('2. 查询所有A02_LINE的直接工时数据:');
  const lineCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: 'A02_LINE' }
  });

  if (lineCode) {
    const directHours = await prisma.workHourResult.findMany({
      where: {
        definitionAttendanceCodeId: lineCode.id,
      },
      orderBy: { calcDate: 'desc' },
      take: 20
    });

    console.log(`  总记录数: ${directHours.length}`);

    if (directHours.length > 0) {
      console.log('\n  直接工时明细:');
      directHours.forEach((dh, index) => {
        console.log(`  [${index + 1}] ${dh.employeeNo} - ${dh.calcDate.toISOString().split('T')[0]} - ${dh.workHours}小时`);
        console.log(`       账户ID: ${dh.accountId}, 账户路径: ${dh.accountPath}`);
        console.log(`       班次ID: ${dh.shiftId}`);
      });

      // 按账户ID分组统计
      console.log('\n  按账户分组统计:');
      const accountGroups = new Map<number, { count: number, hours: number }>();
      directHours.forEach(dh => {
        if (dh.accountId) {
          const current = accountGroups.get(dh.accountId) || { count: 0, hours: 0 };
          accountGroups.set(dh.accountId, {
            count: current.count + 1,
            hours: current.hours + (dh.workHours || 0)
          });
        }
      });

      console.log(`  涉及 ${accountGroups.size} 个账户\n`);
      for (const [accountId, stats] of accountGroups) {
        const account = await prisma.laborAccount.findUnique({
          where: { id: accountId },
          select: { name: true, path: true }
        });
        console.log(`  账户ID=${accountId}: ${stats.count}条记录, ${stats.hours}小时`);
        console.log(`    名称: ${account?.name}`);
        console.log(`    路径: ${account?.path}\n`);
      }
    } else {
      console.log('  ❌ 没有直接工时数据\n');
    }
  }

  // 3. 检查匹配的目标账户
  console.log('3. 检查匹配目标的账户直接工时:');
  const targetAccounts = [
    { accountId: 89, orgId: 7, name: 'W1总装车间L1产线' },
    { accountId: 90, orgId: 8, name: 'W1总装车间L2产线' },
    { accountId: 91, orgId: 9, name: 'W2总装车间L1产线' },
    { accountId: 92, orgId: 10, name: 'W2总装车间L2产线' }
  ];

  for (const target of targetAccounts) {
    console.log(`\n  ${target.name} (账户ID=${target.accountId}):`);

    if (lineCode) {
      const directHours = await prisma.workHourResult.findMany({
        where: {
          accountId: target.accountId,
          definitionAttendanceCodeId: lineCode.id,
        },
        orderBy: { calcDate: 'desc' },
        take: 5
      });

      const totalHours = directHours.reduce((sum, r) => sum + (r.workHours || 0), 0);

      console.log(`    直接工时记录数: ${directHours.length}`);
      console.log(`    总工时: ${totalHours}`);

      if (directHours.length === 0) {
        console.log(`    ❌ 该账户没有任何直接工时记录`);
        console.log(`    💡 这就是为什么分摊范围的直接工时为0`);
      } else {
        console.log(`    最近的记录:`);
        directHours.slice(0, 3).forEach(dh => {
          console.log(`      - ${dh.calcDate.toISOString().split('T')[0]}: ${dh.workHours}小时`);
        });
      }
    }
  }

  // 4. 检查getDirectHoursByLine方法的逻辑
  console.log('\n4. 分析getDirectHoursByLine方法的查询逻辑:');
  console.log('  该方法查询直接工时的条件:');
  console.log('    - calcDate: 指定日期');
  console.log('    - definitionAttendanceCodeId: 直接工时出勤代码ID');
  console.log('    - 结果按"产线ID-班次ID"分组汇总');
  console.log('  关键问题:');
  console.log('    ❌ WorkHourResult表中没有"产线ID"字段');
  console.log('    ❌ 只有accountId和accountPath字段');
  console.log('    ❌ 无法按产线ID分组汇总工时');

  console.log('\n=== 诊断完成 ===');
}

diagnoseDirectHoursIssue()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
