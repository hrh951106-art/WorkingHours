import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查 2026-05-09 的摆卡和打卡数据 ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00.000Z');

  // 1. 查询打卡记录
  console.log('1. 打卡记录:');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      employeeNo,
      punchTime: {
        gte: targetDate,
        lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      device: {
        include: {
          group: true,
        },
      },
      account: true,
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log(`找到 ${punchRecords.length} 条打卡记录`);
  punchRecords.forEach((punch) => {
    console.log(`  时间: ${punch.punchTime.toISOString()}, 类型: ${punch.punchType}, 设备��: ${punch.device?.group?.name || 'null'}, 账户: ${punch.account?.namePath || 'null'}`);
  });

  // 2. 查询摆卡记录
  console.log('\n2. 摆卡记录:');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: targetDate,
    },
    include: {
      inPunch: true,
      outPunch: true,
      account: true,
    },
    orderBy: { inPunchTime: 'asc' },
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录`);
  punchPairs.forEach((pair) => {
    const inTime = pair.inPunchTime?.toISOString() || 'null';
    const outTime = pair.outPunchTime?.toISOString() || 'null';
    const accountPath = pair.account?.namePath || 'null';
    console.log(`  摆卡ID: ${pair.id}, 进: ${inTime}, 出: ${outTime}, 工时: ${pair.workHours}h, 账户: ${accountPath}`);
  });

  // 3. 查询班次信息
  console.log('\n3. 班次信息:');
  const schedules = await prisma.schedule.findMany({
    where: {
      employee: {
        employeeNo,
      },
      scheduleDate: targetDate,
    },
    include: {
      shift: {
        include: {
          segments: {
            orderBy: { startTime: 'asc' },
          },
        },
      },
    },
  });

  if (schedules.length > 0) {
    schedules.forEach((schedule) => {
      console.log(`  班次ID: ${schedule.shiftId}, 班次名称: ${schedule.shift?.name}`);
      if (schedule.shift?.segments) {
        schedule.shift.segments.forEach((seg, idx) => {
          console.log(`    段${idx + 1}: ${seg.startDate} ${seg.startTime} ~ ${seg.endDate} ${seg.endTime}, 类型: ${seg.type}`);
        });
      }
    });
  } else {
    console.log('  未找到排班信息');
  }

  // 4. 查询工时结果
  console.log('\n4. 工时结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: targetDate,
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  console.log(`找到 ${calcResults.length} 条工时结果`);
  calcResults.forEach((result, idx) => {
    const inTime = result.punchInTime?.toISOString() || 'null';
    const outTime = result.punchOutTime?.toISOString() || 'null';
    const accountName = result.accountName || 'null';
    const codeName = result.calculationAttendanceCode?.name || 'null';
    console.log(`  结果${idx + 1}: ${inTime} ~ ${outTime}, 工时: ${result.actualHours}h, 账户: ${accountName}, 代码: ${codeName}`);
  });

  // 5. 分析期望的摆卡结果
  console.log('\n5. 期望的摆卡结果分析:');
  console.log('  期望: 08:00 ~ 12:00, 13:00 ~ 18:00');
  console.log('  这表明打卡时间应该是:');
  console.log('    - 08:00 左右有签入打卡');
  console.log('    - 12:00 左右有签出打卡');
  console.log('    - 13:00 左右有签入打卡');
  console.log('    - 18:00 左右有签出打卡');

  // 6. 对比分析
  console.log('\n6. 问题分析:');
  if (punchPairs.length > 2) {
    console.log(`  ❌ 摆卡数量异常: 期望 2 条, 实际 ${punchPairs.length} 条`);
  } else {
    console.log(`  ✓ 摆卡数量正确: ${punchPairs.length} 条`);
  }

  // 检查时间交叉
  let hasOverlap = false;
  for (let i = 0; i < punchPairs.length - 1; i++) {
    const current = punchPairs[i];
    const next = punchPairs[i + 1];
    if (current.outPunchTime && next.inPunchTime) {
      if (current.outPunchTime > next.inPunchTime) {
        console.log(`  ❌ 时间交叉: 摆卡${current.id}(${current.inPunchTime}~${current.outPunchTime}) 与 摆卡${next.id}(${next.inPunchTime}~${next.outPunchTime})`);
        hasOverlap = true;
      }
    }
  }

  if (!hasOverlap && punchPairs.length === 2) {
    const pair1 = punchPairs[0];
    const pair2 = punchPairs[1];
    const expected1In = new Date('2026-05-09T08:00:00.000Z');
    const expected1Out = new Date('2026-05-09T12:00:00.000Z');
    const expected2In = new Date('2026-05-09T13:00:00.000Z');
    const expected2Out = new Date('2026-05-09T18:00:00.000Z');

    const pair1Match = pair1.inPunchTime?.getTime() === expected1In.getTime() &&
                     pair1.outPunchTime?.getTime() === expected1Out.getTime();
    const pair2Match = pair2.inPunchTime?.getTime() === expected2In.getTime() &&
                     pair2.outPunchTime?.getTime() === expected2Out.getTime();

    if (pair1Match && pair2Match) {
      console.log('  ✓ 摆卡时间正确');
    } else {
      console.log('  ❌ 摆卡时间不匹配期望值');
      console.log(`     期望1: ${expected1In.toISOString()} ~ ${expected1Out.toISOString()}`);
      console.log(`     实际1: ${pair1.inPunchTime?.toISOString()} ~ ${pair1.outPunchTime?.toISOString()}`);
      console.log(`     期望2: ${expected2In.toISOString()} ~ ${expected2Out.toISOString()}`);
      console.log(`     实际2: ${pair2.inPunchTime?.toISOString()} ~ ${pair2.outPunchTime?.toISOString()}`);
    }
  }
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
