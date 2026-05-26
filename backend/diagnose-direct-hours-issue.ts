import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseDirectHoursIssue() {
  console.log('=== A06分摊规则直接工时问题诊断 ===\n');

  // 1. 获取通用配置
  console.log('1. 检查通用配置:');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  if (!generalConfig) {
    console.log('  ❌ 通用配置不存在');
    return;
  }

  console.log(`  直接工时代码: ${generalConfig.actualHoursAllocationCode}`);
  console.log(`  间接工时代码: ${generalConfig.indirectHoursAllocationCode}`);

  // 查找直接工时出勤代码
  const actualHoursCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: generalConfig.actualHoursAllocationCode }
  });

  if (!actualHoursCode) {
    console.log(`  ❌ 未找到直接工时出勤代码: ${generalConfig.actualHoursAllocationCode}`);
    return;
  }

  console.log(`  直接工时出勤代码ID: ${actualHoursCode.id}\n`);

  // 2. 查询待分摊数据
  console.log('2. 查询待分摊的WorkHourResult数据:');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeId: 9, // A04_WORKSHOP
    },
    orderBy: { calcDate: 'desc' },
    include: { employee: true }
  });

  console.log(`  找到 ${workHourResults.length} 条A04_WORKSHOP的工时记录\n`);

  if (workHourResults.length === 0) {
    console.log('  ❌ 没有待分摊数据');
    return;
  }

  workHourResults.forEach((result, index) => {
    console.log(`  [${index + 1}] ID=${result.id}`);
    console.log(`     员工: ${result.employeeNo} - ${result.employee.name}`);
    console.log(`     日期: ${result.calcDate.toISOString().split('T')[0]}`);
    console.log(`     班次ID: ${result.shiftId}`);
    console.log(`     工时: ${result.workHours}`);
    console.log(`     账户路径: ${result.accountPath}`);
    console.log(`     账户ID: ${result.accountId}`);
  });

  // 3. 检查对应日期和班次的直接工时数据
  console.log('\n3. 检查直接工时数据（A02_LINE）:');

  // 获取A02_LINE出勤代码
  const actualLineCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: 'A02_LINE' }
  });

  if (actualLineCode) {
    console.log(`  A02_LINE出勤代码ID: ${actualLineCode.id}\n`);

    // 按日期和班次分组检查
    const groupedByDate = new Map<string, any[]>();
    workHourResults.forEach(result => {
      const key = `${result.calcDate.toISOString().split('T')[0]}-${result.shiftId}`;
      if (!groupedByDate.has(key)) {
        groupedByDate.set(key, []);
      }
      groupedByDate.get(key)!.push(result);
    });

    for (const [key, results] of groupedByDate) {
      const [date, shiftId] = key.split('-');
      console.log(`  📅 日期: ${date}, 班次ID: ${shiftId}`);

      // 查询该日期班次的直接工时
      const directHours = await prisma.workHourResult.findMany({
        where: {
          calcDate: new Date(date),
          shiftId: Number(shiftId),
          definitionAttendanceCodeId: actualLineCode.id,
        },
        include: { employee: true }
      });

      console.log(`     直接工时记录数: ${directHours.length}`);

      if (directHours.length === 0) {
        console.log(`     ❌ 该日期班次没有直接工时数据`);
      } else {
        console.log(`     直接工时明细:`);
        directHours.forEach((dh, idx) => {
          console.log(`       [${idx + 1}] ${dh.employeeNo} - ${dh.employee.name}`);
          console.log(`          工时: ${dh.workHours}`);
          console.log(`          账户路径: ${dh.accountPath}`);
          console.log(`          账户ID: ${dh.accountId || 'N/A'}`);
        });
      }

      // 4. 检查匹配的开线计划
      console.log(`\n  🔍 检查该日期班次的开线计划:`);
      const lineShifts = await prisma.lineShift.findMany({
        where: {
          scheduleDate: new Date(date),
          shiftId: Number(shiftId),
        },
        orderBy: { id: 'asc' }
      });

      console.log(`     开线计划记录数: ${lineShifts.length}`);

      for (const ls of lineShifts) {
        const account = ls.accountId ? await prisma.laborAccount.findUnique({
          where: { id: ls.accountId },
          select: { path: true }
        }) : null;

        console.log(`     [ID=${ls.id}] 组织ID=${ls.orgId}`);
        console.log(`       账户路径: ${account?.path || 'N/A'}`);

        // 检查该产线是否有直接工时
        const lineDirectHours = directHours.filter(dh => dh.accountId === ls.accountId);
        const totalHours = lineDirectHours.reduce((sum, dh) => sum + (dh.workHours || 0), 0);
        console.log(`       该产线直接工时总计: ${totalHours}`);
      }

      console.log('');
    }
  }

  // 5. 重点分析：为什么组织ID=7,8,9,10没有直接工时
  console.log('\n4. 分析匹配目标的直接工时情况:');
  console.log('  从日志中看到匹配到4个产线作为分摊目标:');
  console.log('    - 组织ID=7 (W1总装车间L1产线)');
  console.log('    - 组织ID=8 (W1总装车间L2产线)');
  console.log('    - 组织ID=9 (W2总装车间L1产线)');
  console.log('    - 组织ID=10 (W2总装车间L2产线)');
  console.log('  但这些产线的直接工时都是0\n');

  // 检查这些组织的WorkHourResult
  const targetOrgIds = [7, 8, 9, 10];
  for (const orgId of targetOrgIds) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    console.log(`  组织ID=${orgId} (${org?.name}):`);

    const orgDirectHours = await prisma.workHourResult.findMany({
      where: {
        accountId: orgId,
        definitionAttendanceCodeId: actualLineCode?.id,
      },
      orderBy: { calcDate: 'desc' },
      take: 5
    });

    console.log(`    WorkHourResult中直接工时记录数: ${orgDirectHours.length}`);

    if (orgDirectHours.length === 0) {
      console.log(`    ❌ 该组织没有任何直接工时记录`);
    } else {
      console.log(`    最近的直接工时记录:`);
      orgDirectHours.slice(0, 3).forEach(dh => {
        console.log(`      - ${dh.calcDate.toISOString().split('T')[0]}: ${dh.workHours}小时`);
      });
    }
    console.log('');
  }

  // 6. 检查WorkHourResult表中 accountId 字段使用情况
  console.log('\n5. 检查直接工时的账户分布:');
  const allResults = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeId: actualLineCode?.id
    },
    orderBy: { calcDate: 'desc' },
    take: 20
  });

  console.log(`  最近的${allResults.length}条直接工时记录:`);

  // 按账户ID分组统计
  const accountHoursMap = new Map<number, number>();
  allResults.forEach(result => {
    if (result.accountId) {
      const current = accountHoursMap.get(result.accountId) || 0;
      accountHoursMap.set(result.accountId, current + (result.workHours || 0));
    }
  });

  console.log(`  涉及的账户数量: ${accountHoursMap.size}`);

  // 显示前10个账户的工时
  let count = 0;
  for (const [accountId, totalHours] of accountHoursMap) {
    if (count >= 10) break;
    const account = await prisma.laborAccount.findUnique({
      where: { id: accountId },
      select: { name: true, path: true }
    });
    console.log(`  [${count + 1}] 账户ID=${accountId}`);
    console.log(`       名称: ${account?.name || 'N/A'}`);
    console.log(`       路径: ${account?.path || 'N/A'}`);
    console.log(`       总工时: ${totalHours}`);
    count++;
  }

  // 7. 重点检查：匹配目标的账户是否有直接工时
  console.log('\n6. 检查匹配目标的账户直接工时:');
  console.log('  从开线计划中匹配到4个产线:');

  const matchedLines = [
    { orgId: 7, accountId: 89, name: 'W1总装车间L1产线' },
    { orgId: 8, accountId: 90, name: 'W1总装车间L2产线' },
    { orgId: 9, accountId: 91, name: 'W2总装车间L1产线' },
    { orgId: 10, accountId: 92, name: 'W2总装车间L2产线' }
  ];

  for (const line of matchedLines) {
    console.log(`\n  ${line.name} (组织ID=${line.orgId}, 账户ID=${line.accountId}):`);

    // 查询该账户的直接工时
    const lineDirectHours = await prisma.workHourResult.findMany({
      where: {
        accountId: line.accountId,
        definitionAttendanceCodeId: actualLineCode?.id,
      },
      orderBy: { calcDate: 'desc' },
      take: 5
    });

    const totalHours = lineDirectHours.reduce((sum, r) => sum + (r.workHours || 0), 0);

    console.log(`    直接工时记录数: ${lineDirectHours.length}`);
    console.log(`    总工时: ${totalHours}`);

    if (lineDirectHours.length > 0) {
      console.log(`    最近的记录:`);
      lineDirectHours.slice(0, 3).forEach(dh => {
        console.log(`      - ${dh.calcDate.toISOString().split('T')[0]}: ${dh.workHours}小时`);
      });
    } else {
      console.log(`    ❌ 该账户没有任何直接工时记录`);
    }
  }

  console.log('\n=== 诊断完成 ===');
}

diagnoseDirectHoursIssue()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
