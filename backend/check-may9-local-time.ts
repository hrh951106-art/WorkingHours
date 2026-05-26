import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 格式化为本地时间字符串
function toLocalTime(date: Date | null): string {
  if (!date) return 'null';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function main() {
  console.log('=== 检查 2026-05-09 的摆卡和打卡数据（本地时间） ===\n');

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
    console.log(`  时间: ${toLocalTime(punch.punchTime)}, 类型: ${punch.punchType}, 设备组: ${punch.device?.group?.name || 'null'}, 账户: ${punch.account?.namePath || 'null'}`);
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
    const inTime = toLocalTime(pair.inPunchTime);
    const outTime = toLocalTime(pair.outPunchTime);
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
          // 将班段时间转换为本地时间显示
          const segStart = new Date(targetDate);
          const segEnd = new Date(targetDate);
          const [startHours, startMinutes] = seg.startTime.split(':').map(Number);
          const [endHours, endMinutes] = seg.endTime.split(':').map(Number);

          if (seg.startDate === '+0') {
            segStart.setHours(startHours, startMinutes, 0, 0);
          } else if (seg.startDate === '+1') {
            segStart.setDate(segStart.getDate() + 1);
            segStart.setHours(startHours, startMinutes, 0, 0);
          }

          if (seg.endDate === '+0') {
            segEnd.setHours(endHours, endMinutes, 0, 0);
          } else if (seg.endDate === '+1') {
            segEnd.setDate(segEnd.getDate() + 1);
            segEnd.setHours(endHours, endMinutes, 0, 0);
          }

          console.log(`    段${idx + 1}: ${toLocalTime(segStart)} ~ ${toLocalTime(segEnd)}, 类型: ${seg.type}`);
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
    const inTime = toLocalTime(result.punchInTime);
    const outTime = toLocalTime(result.punchOutTime);
    const accountName = result.accountName || 'null';
    const codeName = result.calculationAttendanceCode?.name || 'null';
    console.log(`  结果${idx + 1}: ${inTime} ~ ${outTime}, 工时: ${result.actualHours}h, 账户: ${accountName}, 代码: ${codeName}`);
  });

  // 5. 分析期望的摆卡结果
  console.log('\n5. 期望的摆卡结果:');
  console.log('  第一段: 08:00:00 ~ 12:00:00');
  console.log('  第二段: 13:00:00 ~ 18:00:00');

  // 6. 对比分析
  console.log('\n6. 对比分析:');
  console.log('  实际打卡时间:');
  punchRecords.forEach((punch, idx) => {
    console.log(`    ${idx + 1}. ${toLocalTime(punch.punchTime)} ${punch.punchType}`);
  });

  console.log('\n  期望打卡时间（基于期望摆卡）:');
  console.log('    1. 08:00:00 IN');
  console.log('    2. 12:00:00 OUT');
  console.log('    3. 13:00:00 IN');
  console.log('    4. 18:00:00 OUT');

  console.log('\n  结论:');
  if (punchRecords.length > 0) {
    const firstPunchTime = toLocalTime(punchRecords[0].punchTime);
    const lastPunchTime = toLocalTime(punchRecords[punchRecords.length - 1].punchTime);

    console.log(`  ❌ 实际打卡时间范围: ${firstPunchTime} ~ ${lastPunchTime}`);
    console.log(`  ❌ 期望打卡时间范围: 08:00:00 ~ 18:00:00`);
    console.log(`  ❌ 时间完全不匹配！`);
  }
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
