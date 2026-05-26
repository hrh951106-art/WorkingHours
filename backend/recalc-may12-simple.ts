import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 复制修复后的 parseSegmentTime 函数
function parseSegmentTime(baseDate: Date, startDate: string, timeStr: string): Date {
  const result = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  const [hours, minutes] = timeStr.split(':').map(Number);

  if (startDate === '+0') {
    result.setHours(hours, minutes, 0, 0);
  } else if (startDate === '+1') {
    result.setDate(result.getDate() + 1);
    result.setHours(hours, minutes, 0, 0);
  }

  return result;
}

// 复制修复后的 splitTimeBySegments 函数
function splitTimeBySegments(
  inTime: Date,
  outTime: Date,
  shift: any,
  segmentTransferMap: Map<number, number>,
  calcDate: Date
): Array<{ startTime: Date; endTime: Date; transferAccountId: number | null }> {
  const workSegments = shift.segments.filter((s: any) => s.type !== 'REST');
  const timeSegments = [];

  // 步骤1: 计算打卡时间与每个班段的交集（班内时间）
  for (const segment of workSegments) {
    const segmentStartTime = parseSegmentTime(calcDate, segment.startDate, segment.startTime);
    const segmentEndTime = parseSegmentTime(calcDate, segment.endDate, segment.endTime);

    const overlapStart = inTime > segmentStartTime ? inTime : segmentStartTime;
    const overlapEnd = outTime < segmentEndTime ? outTime : segmentEndTime;

    if (overlapStart < overlapEnd) {
      const transferAccountId = segmentTransferMap.get(segment.id) || null;
      timeSegments.push({
        startTime: overlapStart,
        endTime: overlapEnd,
        transferAccountId: transferAccountId,
      });
    }
  }

  // 步骤2: 计算班外时间（不在任何班段内的时间）
  const insideSegments = timeSegments
    .filter(seg => seg.transferAccountId !== null)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  let currentTime = inTime;
  for (const segment of insideSegments) {
    if (currentTime < segment.startTime) {
      timeSegments.push({
        startTime: currentTime,
        endTime: segment.startTime,
        transferAccountId: null,
      });
    }
    currentTime = segment.endTime > currentTime ? segment.endTime : currentTime;
  }

  if (currentTime < outTime) {
    timeSegments.push({
      startTime: currentTime,
      endTime: outTime,
      transferAccountId: null,
    });
  }

  // 如果没有时间段，返回原始时间段
  if (timeSegments.length === 0) {
    return [{
      startTime: inTime,
      endTime: outTime,
      transferAccountId: null,
    }];
  }

  return timeSegments;
}

async function main() {
  console.log('=== 重新计算 2026-05-12 的工时（简化版，不计算金额） ===\n');

  const employeeNo = '202604003';
  const calcDate = new Date('2026-05-12T00:00:00.000Z');

  // 1. 删除旧的工时结果
  console.log('1. 删除旧工时结果:');
  const deleteResult = await prisma.calcResult.deleteMany({
    where: {
      employeeNo,
      calcDate: calcDate,
    },
  });
  console.log(`   删除了 ${deleteResult.count} 条旧工时结果`);

  // 2. 查询摆卡记录
  console.log('\n2. 查询摆卡记录:');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: calcDate,
    },
    orderBy: { inPunchTime: 'asc' },
  });

  console.log(`   找到 ${punchPairs.length} 条摆卡记录`);

  // 3. 查询计算出勤代码
  const attendanceCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      type: 'LEAN_HOURS',
      status: 'ACTIVE',
      calculateHours: true,
    },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });

  // 4. 为每个摆卡记录生成工时结果
  console.log('\n3. 为每个摆卡记录生成工时结果:');
  let totalResults = 0;

  for (const punchPair of punchPairs) {
    console.log(`\n   摆卡 ${punchPair.id} (${punchPair.inPunchTime?.toISOString()} ~ ${punchPair.outPunchTime?.toISOString() || 'null'})`);

    // 跳过单卡摆卡
    if (!punchPair.outPunchTime) {
      console.log(`     跳过单卡摆卡`);
      continue;
    }

    // 查询班次信息
    const shift = punchPair.shiftId ? await prisma.shift.findUnique({
      where: { id: punchPair.shiftId },
      include: {
        segments: {
          orderBy: { startTime: 'asc' },
        },
      },
    }) : null;

    // 查询排班信息和转移账户
    const employee = await prisma.employee.findFirst({
      where: { employeeNo },
    });

    const schedule = employee ? await prisma.schedule.findFirst({
      where: {
        employeeId: employee.id,
        shiftId: punchPair.shiftId,
        scheduleDate: {
          gte: new Date(calcDate.getFullYear(), calcDate.getMonth(), calcDate.getDate(), 0, 0, 0, 0),
          lt: new Date(calcDate.getFullYear(), calcDate.getMonth(), calcDate.getDate() + 1, 0, 0, 0, 0),
        },
      },
    }) : null;

    const segmentTransferMap = new Map<number, number>();
    if (schedule?.adjustedSegments) {
      try {
        const adjustedSegments = JSON.parse(schedule.adjustedSegments);
        adjustedSegments.forEach((seg: any) => {
          if (seg.id && seg.accountId) {
            segmentTransferMap.set(seg.id, seg.accountId);
          }
        });
      } catch (e) {
        // ignore
      }
    }

    // 拆分时间段
    const inTime = new Date(punchPair.inPunchTime);
    const outTime = new Date(punchPair.outPunchTime);

    const timeSegments = splitTimeBySegments(inTime, outTime, shift, segmentTransferMap, calcDate);

    console.log(`     时间段拆分结果 (${timeSegments.length} 段):`);
    timeSegments.forEach((seg, idx) => {
      const hours = ((seg.endTime.getTime() - seg.startTime.getTime()) / (1000 * 60 * 60));
      console.log(`       段${idx + 1}: ${seg.startTime.toISOString()} ~ ${seg.endTime.toISOString()}, 工时: ${hours.toFixed(2)}h, 转移账户: ${seg.transferAccountId || 'null'}`);
    });

    // 为每个时间段和每个出勤代码创建工时结果
    for (const seg of timeSegments) {
      for (const code of attendanceCodes) {
        // 简化账户匹配逻辑（只检查刷卡账户）
        if (punchPair.accountId && code.accountLevels) {
          const accountLevels = JSON.parse(code.accountLevels);
          const account = await prisma.laborAccount.findUnique({
            where: { id: punchPair.accountId },
          });

          if (account) {
            const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');
            const accountFilledLevels = hierarchyValues
              .filter((hv: any) => hv.selectedValue)
              .map((hv: any) => hv.level);

            const requiredLevels = new Set(accountLevels.map((s: any) => s + 1));

            if (accountFilledLevels.length !== requiredLevels.size) {
              continue;
            }

            for (const level of accountFilledLevels) {
              if (!requiredLevels.has(level)) {
                continue;
              }
            }
          }
        }

        // 创建工时结果
        const hours = ((seg.endTime.getTime() - seg.startTime.getTime()) / (1000 * 60 * 60));
        if (hours <= 0) continue;

        await prisma.calcResult.create({
          data: {
            employeeNo,
            calcDate,
            shiftId: punchPair.shiftId,
            shiftName: punchPair.shiftName,
            calculationAttendanceCodeId: code.id,
            punchInTime: seg.startTime,
            punchOutTime: seg.endTime,
            standardHours: 9,
            actualHours: Math.round(hours * 100) / 100,
            overtimeHours: 0,
            leaveHours: 0,
            absenceHours: 0,
            amount: 0,
            accountId: punchPair.accountId,
            accountName: punchPair.account?.namePath || null,
            status: 'COMPLETED',
          },
        });

        totalResults++;
        console.log(`       创建工时结果: ${seg.startTime.toISOString()} ~ ${seg.endTime.toISOString()}, ${hours.toFixed(2)}h, 代码: ${code.name}`);
      }
    }
  }

  console.log(`\n   总共生成了 ${totalResults} 条工时结果`);

  // 5. 查询最终结果
  console.log('\n4. 最终工时结果:');
  const finalResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: calcDate,
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  finalResults.forEach((result, idx) => {
    console.log(`   结果${idx + 1}:`);
    console.log(`     时间: ${result.punchInTime?.toISOString()} ~ ${result.punchOutTime?.toISOString()}`);
    console.log(`     工时: ${result.actualHours}h`);
    console.log(`     账户: ${result.accountName || 'null'}`);
    console.log(`     出勤代码: ${result.calculationAttendanceCode?.name || 'null'}`);
  });
}

main()
  .then(() => console.log('\n重新计算完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
