import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllPunchPairTables() {
  console.log('========================================');
  console.log('查询 AttendancePunchPair 和 PunchPair 表的所有数据');
  console.log('========================================\n');

  // 1. 查询 AttendancePunchPair 表（精益摆卡表）
  console.log('【1️⃣ AttendancePunchPair 表（精益摆卡表）】\n');

  const attendancePunchPairs = await prisma.attendancePunchPair.findMany({
    include: {
      employee: {
        select: {
          employeeNo: true,
          name: true,
        },
      },
    },
    orderBy: { punchDate: 'desc' },
    take: 20, // 限制显示20条
  });

  console.log(`找到 ${attendancePunchPairs.length} 条记录（显示前20条）\n`);

  if (attendancePunchPairs.length === 0) {
    console.log('❌ AttendancePunchPair 表为空\n');
  } else {
    attendancePunchPairs.forEach((pair, index) => {
      const formatDate = (date: Date | null) => date ? date.toISOString().substring(0, 10) : '-';
      const formatTime = (date: Date | null) => date ? date.toISOString().substring(11, 16) : '-';

      console.log(`${index + 1}. ID: ${pair.id}`);
      console.log(`   员工: ${pair.employee?.name || '-'} (${pair.employeeNo})`);
      console.log(`   日期: ${formatDate(pair.punchDate)}`);
      console.log(`   规则ID: ${pair.ruleId || '-'}`);
      console.log(`   规则类型: ${pair.ruleType || '-'}`);
      console.log(`   规则名称: ${pair.ruleName || '-'}`);
      console.log(`   上班打卡: ${formatTime(pair.workStartPunchTime)}`);
      console.log(`   下班打卡: ${formatTime(pair.workEndPunchTime)}`);
      console.log(`   账户ID: ${pair.accountId || '-'}`);
      console.log(`   创建时间: ${pair.createdAt?.toISOString() || '-'}`);
      console.log('');
    });
  }

  // 2. 查询 PunchPair 表（旧摆卡表）
  console.log('\n【2️⃣ PunchPair 表（旧摆卡表）】\n');

  const punchPairs = await prisma.punchPair.findMany({
    include: {
      employee: {
        select: {
          employeeNo: true,
          name: true,
        },
      },
      account: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { pairDate: 'desc' },
    take: 20, // 限制显示20条
  });

  console.log(`找到 ${punchPairs.length} 条记录（显示前20条）\n`);

  if (punchPairs.length === 0) {
    console.log('❌ PunchPair 表为空\n');
  } else {
    punchPairs.forEach((pair, index) => {
      const formatDate = (date: number | null) => date ? new Date(date).toISOString().substring(0, 10) : '-';
      const formatTime = (date: number | null) => date ? new Date(date).toISOString().substring(11, 16) : '-';

      console.log(`${index + 1}. ID: ${pair.id}`);
      console.log(`   员工: ${pair.employee?.name || '-'} (${pair.employeeNo})`);
      console.log(`   日期: ${formatDate(pair.pairDate as any)}`);
      console.log(`   上班打卡: ${formatTime(pair.inPunchTime as any)}`);
      console.log(`   下班打卡: ${formatTime(pair.outPunchTime as any)}`);
      console.log(`   账户: ${pair.account?.name || '-'}`);
      console.log(`   工时: ${pair.workHours || '-'}`);
      console.log(`   状态: ${pair.status || '-'}`);
      console.log(`   创建时间: ${pair.createdAt ? new Date(pair.createdAt).toISOString() : '-'}`);
      console.log('');
    });
  }

  // 3. 统计信息
  console.log('\n【3️⃣ 表统计信息】\n');

  const [attendanceCount, punchCount] = await Promise.all([
    prisma.attendancePunchPair.count(),
    prisma.punchPair.count(),
  ]);

  console.log(`AttendancePunchPair 表总记录数: ${attendanceCount}`);
  console.log(`PunchPair 表总记录数: ${punchCount}`);

  // 4. 检查员工 202604003 的数据
  console.log('\n【4️⃣ 员工 202604003 的数据】\n');

  const employeeNo = '202604003';

  const [employeeAttendancePairs, employeePunchPairs] = await Promise.all([
    prisma.attendancePunchPair.findMany({
      where: { employeeNo },
      orderBy: { punchDate: 'desc' },
      take: 10,
    }),
    prisma.punchPair.findMany({
      where: { employeeNo },
      orderBy: { pairDate: 'desc' },
      take: 10,
    }),
  ]);

  console.log(`员工 202604003:\n`);
  console.log(`  AttendancePunchPair: ${employeeAttendancePairs.length} 条记录`);
  console.log(`  PunchPair: ${employeePunchPairs.length} 条记录`);

  if (employeePunchPairs.length > 0) {
    console.log(`\n  最近 PunchPair 记录:`);
    employeePunchPairs.forEach((pair) => {
      const formatDate = (date: number | null) => date ? new Date(date).toISOString().substring(0, 10) : '-';
      const formatTime = (date: number | null) => date ? new Date(date).toISOString().substring(11, 16) : '-';
      console.log(`    ${formatDate(pair.pairDate as any)}: ${formatTime(pair.inPunchTime as any)} - ${formatTime(pair.outPunchTime as any)} (${pair.workHours}h)`);
    });
  }

  console.log('\n========================================');
}

checkAllPunchPairTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('错误:', err);
    process.exit(1);
  });
