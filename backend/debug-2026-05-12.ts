import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询2026-05-12的PunchPair数据
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      pairDate: {
        gte: new Date('2026-05-12T00:00:00'),
        lt: new Date('2026-05-13T00:00:00')
      }
    },
    include: {
      employee: true,
    },
    orderBy: {
      employeeNo: 'asc',
    },
  });

  console.log('2026-05-12的PunchPair数据:');
  console.log(`总数: ${punchPairs.length}`);
  console.log('');

  punchPairs.forEach(p => {
    const pairDate = new Date(p.pairDate);
    console.log(`- 员工: ${p.employeeNo} (${p.employee?.name})`);
    console.log(`  摆卡ID: ${p.id}`);
    console.log(`  摆卡日期: ${pairDate.toISOString().split('T')[0]}`);
    console.log(`  shiftId: ${p.shiftId}`);
    console.log(`  shiftName: ${p.shiftName}`);
    console.log(`  上班: ${p.inPunchTime ? new Date(p.inPunchTime).toTimeString().split(' ')[0] : '无'}`);
    console.log(`  下班: ${p.outPunchTime ? new Date(p.outPunchTime).toTimeString().split(' ')[0] : '无'}`);
    console.log(`  工时: ${p.workHours}小时`);
    console.log('');
  });

  // 查询2026-05-12的CalcResult数据（按类型分组）
  const allCalcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: new Date('2026-05-12T00:00:00'),
        lt: new Date('2026-05-13T00:00:00')
      }
    },
    include: {
      calculationAttendanceCode: true,
    },
  });

  console.log('2026-05-12的所有工时计算结果:');
  console.log(`总数: ${allCalcResults.length}`);
  console.log('');

  // 按类型分组
  const leanResults = allCalcResults.filter(r => r.calculationAttendanceCode?.type === 'LEAN_HOURS');
  const attendanceResults = allCalcResults.filter(r => r.calculationAttendanceCode?.type === 'ATTENDANCE_HOURS');

  console.log(`- LEAN_HOURS类型: ${leanResults.length}条`);
  leanResults.forEach(r => {
    console.log(`  ID: ${r.id}, 员工: ${r.employeeNo}, 出勤代码: ${r.calculationAttendanceCode?.name}, 工时: ${r.actualHours}小时, shiftId: ${r.shiftId}`);
  });

  console.log('');
  console.log(`- ATTENDANCE_HOURS类型: ${attendanceResults.length}条`);
  attendanceResults.forEach(r => {
    console.log(`  ID: ${r.id}, 员工: ${r.employeeNo}, 出勤代码: ${r.calculationAttendanceCode?.name}, 工时: ${r.actualHours}小时, shiftId: ${r.shiftId}`);
  });

  console.log('');
  console.log('分析：为什么没有精益工时结果？');
  console.log('1. PunchPair数据存在：', punchPairs.length > 0 ? '是' : '否');
  console.log('2. 精益工时计算结果存在：', leanResults.length > 0 ? '是' : '否');
  console.log('3. PunchPair的shiftId值：');
  punchPairs.forEach(p => {
    console.log(`   - 员工${p.employeeNo}: shiftId=${p.shiftId} (${p.shiftId === null ? '精益打卡' : '考勤打卡'})`);
  });

  console.log('');
  console.log('结论：');
  if (punchPairs.length > 0 && leanResults.length === 0) {
    console.log('⚠️ 2026-05-12有PunchPair数据，但没有精益工时计算结果');
    console.log('原因可能是：');
    punchPairs.forEach(p => {
      if (p.shiftId !== null) {
        console.log(`  - 员工${p.employeeNo}的shiftId=${p.shiftId}不为null，系统认为这是考勤打卡，不会计算精益工时`);
        console.log(`    精益工时只计算shiftId为null的摆卡记录`);
      }
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
