import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查工时计算逻辑 ===\n');

  // 1. 查询摆卡记录 193 的详细信息
  const punchPair = await prisma.punchPair.findUnique({
    where: { id: 193 },
    include: {
      inPunch: {
        include: { device: true, account: true },
      },
      outPunch: {
        include: { device: true, account: true },
      },
      account: true,
    },
  });

  if (!punchPair) {
    console.log('摆卡记录 193 不存在');
    return;
  }

  console.log('1. 摆卡记录 193:');
  console.log(`   时间: ${punchPair.inPunchTime?.toISOString()} ~ ${punchPair.outPunchTime?.toISOString()}`);
  console.log(`   账户: ${punchPair.account?.namePath || 'null'}`);
  console.log(`   班次ID: ${punchPair.shiftId}`);

  // 2. 查询班次信息
  const shift = await prisma.shift.findUnique({
    where: { id: punchPair.shiftId! },
    include: {
      segments: {
        orderBy: { startTime: 'asc' },
      },
    },
  });

  console.log('\n2. 班次信息:');
  console.log(`   班次名称: ${shift?.name}`);
  console.log(`   班段数量: ${shift?.segments?.length || 0}`);

  if (shift?.segments) {
    shift.segments.forEach((seg, idx) => {
      console.log(`   段${idx + 1}: ${seg.startDate} ${seg.startTime} ~ ${seg.endDate} ${seg.endTime}, 类型: ${seg.type}, ID: ${seg.id}`);
    });
  }

  // 3. 查询排班信息和 adjustedSegments
  const employee = await prisma.employee.findFirst({
    where: { employeeNo: punchPair.employeeNo },
  });

  const dayStart = new Date(punchPair.pairDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(punchPair.pairDate);
  dayEnd.setHours(23, 59, 59, 999);

  const schedule = await prisma.schedule.findFirst({
    where: {
      employeeId: employee?.id,
      scheduleDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      shiftId: punchPair.shiftId,
    },
  });

  console.log('\n3. 排班信息:');
  if (schedule?.adjustedSegments) {
    try {
      const adjusted = JSON.parse(schedule.adjustedSegments);
      console.log(`   adjustedSegments:`);
      adjusted.forEach((seg: any, idx: number) => {
        console.log(`   段${idx + 1}: ID=${seg.id}, 账户ID=${seg.accountId || 'null'}`);
      });
    } catch (e) {
      console.log('   解析失败:', e);
    }
  } else {
    console.log('   adjustedSegments: null');
  }

  // 4. 手动计算时间拆分
  console.log('\n4. 手动计算时间拆分:');
  const inTime = new Date(punchPair.inPunchTime!);
  const outTime = new Date(punchPair.outPunchTime!);

  console.log(`   打卡时间: ${inTime.toISOString()} ~ ${outTime.toISOString()}`);

  if (shift?.segments) {
    const workSegments = shift.segments.filter((s) => s.type !== 'REST');

    if (workSegments.length > 0) {
      // 解析班段时间
      const parseSegmentTime = (baseDate: Date, startDate: string, timeStr: string) => {
        const result = new Date(baseDate);
        const [hours, minutes] = timeStr.split(':').map(Number);

        if (startDate === '+0') {
          result.setHours(hours, minutes, 0, 0);
        } else if (startDate === '+1') {
          result.setDate(result.getDate() + 1);
          result.setHours(hours, minutes, 0, 0);
        }

        return result;
      };

      const firstSegmentStart = parseSegmentTime(punchPair.pairDate, workSegments[0].startDate, workSegments[0].startTime);
      const lastSegmentEnd = parseSegmentTime(punchPair.pairDate, workSegments[workSegments.length - 1].startDate, workSegments[workSegments.length - 1].endTime);

      console.log(`   班次时间范围: ${firstSegmentStart.toISOString()} ~ ${lastSegmentEnd.toISOString()}`);

      // 检查打卡时间与班次时间的交集
      console.log('\n5. 时间段分析:');
      console.log(`   班前: ${inTime < firstSegmentStart ? '是' : '否'}`);
      console.log(`   班后: ${outTime > lastSegmentEnd ? '是' : '否'}`);

      // 逐段分析
      console.log('\n6. 各班段分析:');
      const segmentTransferMap = new Map<number, number>();

      if (schedule?.adjustedSegments) {
        try {
          const adjusted = JSON.parse(schedule.adjustedSegments);
          adjusted.forEach((seg: any) => {
            if (seg.id && seg.accountId) {
              segmentTransferMap.set(seg.id, seg.accountId);
            }
          });
        } catch (e) {
          // ignore
        }
      }

      workSegments.forEach((seg, idx) => {
        const segmentStartTime = parseSegmentTime(punchPair.pairDate, seg.startDate, seg.startTime);
        const segmentEndTime = parseSegmentTime(punchPair.pairDate, seg.endDate, seg.endTime);

        // 计算交集
        const overlapStart = inTime > segmentStartTime ? inTime : segmentStartTime;
        const overlapEnd = outTime < segmentEndTime ? outTime : segmentEndTime;

        const hasOverlap = overlapStart < overlapEnd;
        const overlapHours = hasOverlap ? (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60) : 0;

        const transferAccountId = segmentTransferMap.get(seg.id) || null;

        console.log(`   段${idx + 1} (${seg.startTime}~${seg.endTime}):`);
        console.log(`     段时间: ${segmentStartTime.toISOString()} ~ ${segmentEndTime.toISOString()}`);
        console.log(`     有交集: ${hasOverlap ? '是' : '否'}`);
        if (hasOverlap) {
          console.log(`     交集: ${overlapStart.toISOString()} ~ ${overlapEnd.toISOString()}`);
          console.log(`     工时: ${overlapHours.toFixed(2)}h`);
          console.log(`     转移账户ID: ${transferAccountId || 'null'}`);
        }
      });
    }
  }

  // 5. 查询所有计算出勤代码
  console.log('\n7. 所有计算出勤代码:');
  const attendanceCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      type: 'LEAN_HOURS',
      status: 'ACTIVE',
      calculateHours: true,
    },
    orderBy: [
      { priority: 'asc' },
      { id: 'asc' },
    ],
  });

  attendanceCodes.forEach((code) => {
    console.log(`   代码: ${code.code}, 名称: ${code.name}, 优先级: ${code.priority}`);
    console.log(`     accountLevels: ${code.accountLevels || 'null'}`);
    console.log(`     includeOutside: ${code.includeOutside}, onlyOutside: ${code.onlyOutside}`);
    console.log(`     deductMeal: ${code.deductMeal}`);
  });
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
