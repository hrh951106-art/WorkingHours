import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeWorkHour() {
  const employeeNo = '202605013';
  console.log(`=== 检查员工 ${employeeNo} 的工时记录情况 ===\n`);

  // 1. 查询员工基本信息
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true, status: true },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    await prisma.$disconnect();
    return;
  }

  console.log('1. 员工基本信息：');
  console.log(`  ID: ${employee.id}`);
  console.log(`  姓名: ${employee.name}`);
  console.log(`  状态: ${employee.status}`);
  console.log('');

  // 2. 查询工时记录
  console.log('2. 查询工时记录（所有日期）：');
  const workHourResults = await prisma.workHourResult.findMany({
    where: { employeeNo },
    select: {
      id: true,
      workDate: true,
      accountId: true,
      accountName: true,
      workHours: true,
      source: true,
      createdAt: true,
    },
    orderBy: { workDate: 'desc' },
    take: 10,
  });

  console.log(`  找到 ${workHourResults.length} 条工时记录\n`);
  if (workHourResults.length > 0) {
    workHourResults.forEach((wh) => {
      console.log(`  - 日期: ${wh.workDate.toISOString().substring(0, 10)}`);
      console.log(`    账户: ${wh.accountName} (ID: ${wh.accountId})`);
      console.log(`    工时: ${wh.workHours}`);
      console.log(`    来源: ${wh.source}`);
      console.log(`    创建时间: ${wh.createdAt.toISOString().substring(0, 19)}`);
      console.log('');
    });
  } else {
    console.log('  ❌ 没有任何工时记录');
  }

  // 3. 查询2026-05-19的打卡配对记录
  console.log('3. 查询2026-05-19的打卡配对记录：');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: new Date('2026-05-19'),
    },
    select: {
      id: true,
      pairDate: true,
      inPunchTime: true,
      outPunchTime: true,
      shiftName: true,
      workHours: true,
      accountId: true,
    },
  });

  console.log(`  找到 ${punchPairs.length} 条打卡配对记录\n`);
  if (punchPairs.length > 0) {
    punchPairs.forEach((pr) => {
      console.log(`  记录 ${pr.id}:`);
      console.log(`    日期: ${pr.pairDate.toISOString().substring(0, 10)}`);
      console.log(`    上班: ${pr.inPunchTime ? pr.inPunchTime.toISOString().substring(11, 19) : 'NULL'}`);
      console.log(`    下班: ${pr.outPunchTime ? pr.outPunchTime.toISOString().substring(11, 19) : 'NULL'}`);
      console.log(`    班次: ${pr.shiftName || 'NULL'}`);
      console.log(`    工时: ${pr.workHours}`);
      console.log(`    账户ID: ${pr.accountId || 'NULL'}`);
      console.log('');
    });
  } else {
    console.log('  ❌ 2026-05-19没有打卡配对记录');
  }

  // 4. 查询所有打卡配对记录（最近10条）
  console.log('4. 查询最近的打卡配对记录：');
  const recentPunchPairs = await prisma.punchPair.findMany({
    where: { employeeNo },
    select: {
      id: true,
      pairDate: true,
      inPunchTime: true,
      outPunchTime: true,
      workHours: true,
    },
    orderBy: { pairDate: 'desc' },
    take: 10,
  });

  console.log(`  找到 ${recentPunchPairs.length} 条打卡配对记录\n`);
  if (recentPunchPairs.length > 0) {
    recentPunchPairs.forEach((pr) => {
      console.log(`  ${pr.pairDate.toISOString().substring(0, 10)}: ${pr.inPunchTime ? '有上班' : '无上班'} ${pr.outPunchTime ? '有下班' : '无下班'} 工时:${pr.workHours}`);
    });
  } else {
    console.log('  ❌ 没有任何打卡配对记录');
  }

  // 5. 检查员工是否有劳动力账户
  console.log('\n5. 检查劳动力账户：');
  const laborAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    select: { id: true, code: true, status: true },
  });

  console.log(`  劳动力账户数: ${laborAccounts.length}`);
  if (laborAccounts.length > 0) {
    laborAccounts.forEach((acc) => {
      console.log(`    账户 ${acc.id}: ${acc.code} (${acc.status})`);
    });
  } else {
    console.log('  ❌ 员工没有劳动力账户');
  }

  // 6. 总结
  console.log('\n=== 分析总结 ===');
  console.log(`员工 ${employeeNo} (${employee.name}) 在2026-05-19没有工时记录的可能原因：`);

  if (punchPairs.length === 0) {
    console.log('1. ❌ 当天没有打卡配对记录（可能没有打卡或打卡未配对成功）');
  } else {
    console.log('1. ✅ 当天有打卡配对记录');
  }

  if (workHourResults.length === 0) {
    console.log('2. ❌ 从未有工时记录生成');
  } else {
    console.log('2. ✅ 历史上有工时记录生成');
    console.log(`   最后一条工时记录日期: ${workHourResults[0].workDate.toISOString().substring(0, 10)}`);
  }

  if (laborAccounts.length === 0) {
    console.log('3. ❌ 员工没有劳动力账户（无法生成工时记录）');
  } else {
    console.log(`3. ✅ 员工有 ${laborAccounts.length} 个劳动力账户`);
  }

  await prisma.$disconnect();
}

checkEmployeeWorkHour()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
