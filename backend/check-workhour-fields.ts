import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查工时结果的日期字段 ==========\n');

  // 查询5月19日所有考勤代码的工时结果
  console.log('【查询5月19日A06考勤代码的工时结果】\n');

  const results1 = await prisma.workHourResult.findMany({
    where: {
      calcDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    },
    select: {
      id: true,
      employeeNo: true,
      workDate: true,
      calcDate: true,
      attendanceCode: true,
      workHours: true,
      accountPath: true,
      status: true
    }
  });

  console.log(`按calcDate查询: 找到${results1.length}条\n`);
  if (results1.length > 0) {
    for (const r of results1.slice(0, 3)) {
      console.log(`  ID=${r.id}: workDate=${r.workDate?.toISOString().substring(0, 10)}, calcDate=${r.calcDate?.toISOString().substring(0, 10)}, 工时=${r.workHours}, 状态=${r.status}`);
    }
  }

  console.log('\n【查询5月19日workDate的工时结果】\n');

  const results2 = await prisma.workHourResult.findMany({
    where: {
      workDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    },
    select: {
      id: true,
      employeeNo: true,
      workDate: true,
      calcDate: true,
      attendanceCode: true,
      workHours: true,
      accountPath: true,
      status: true
    }
  });

  console.log(`按workDate查询: 找到${results2.length}条\n`);
  if (results2.length > 0) {
    for (const r of results2.slice(0, 3)) {
      console.log(`  ID=${r.id}: workDate=${r.workDate?.toISOString().substring(0, 10)}, calcDate=${r.calcDate?.toISOString().substring(0, 10)}, 工时=${r.workHours}, 状态=${r.status}`);
    }
  }

  console.log('\n【查询5月18日workDate的工时结果】\n');

  const results3 = await prisma.workHourResult.findMany({
    where: {
      workDate: new Date('2026-05-18'),
      attendanceCode: 'A06'
    },
    select: {
      id: true,
      employeeNo: true,
      workDate: true,
      calcDate: true,
      attendanceCode: true,
      workHours: true,
      accountPath: true,
      status: true
    }
  });

  console.log(`按workDate查询: 找到${results3.length}条\n`);
  if (results3.length > 0) {
    for (const r of results3.slice(0, 3)) {
      console.log(`  ID=${r.id}: workDate=${r.workDate?.toISOString().substring(0, 10)}, calcDate=${r.calcDate?.toISOString().substring(0, 10)}, 工时=${r.workHours}, 状态=${r.status}`);
    }
  }

  console.log('\n【关键问题】\n');
  console.log('生产记录日期: 2026-05-19');
  console.log(`calcDate=2026-05-19的工时结果: ${results1.length}条`);
  console.log(`workDate=2026-05-19的工时结果: ${results2.length}条`);
  console.log(`workDate=2026-05-18的工时结果: ${results3.length}条`);

  if (results1.length > 0 && results2.length === 0) {
    console.log('\n❌ 问题找到了！');
    console.log('   工时结果的calcDate是5月19日');
    console.log('   但workDate是5月18日或其他日期');
    console.log('   分摊计算使用workDate查询，所以找不到工时结果！');
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
