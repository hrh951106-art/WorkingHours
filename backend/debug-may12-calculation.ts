import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 复制 attendance-code.service.ts 的 parseSegmentTime 函数
function parseSegmentTime(baseDate: Date, startDate: string, timeStr: string): Date {
  const result = new Date(baseDate);
  const [hours, minutes] = timeStr.split(':').map(Number);

  if (startDate === '+0') {
    // 当天
    result.setHours(hours, minutes, 0, 0);
  } else if (startDate === '+1') {
    // 次日
    result.setDate(result.getDate() + 1);
    result.setHours(hours, minutes, 0, 0);
  }

  return result;
}

async function main() {
  console.log('=== 调试 2026-05-12 工时计算 ===\n');

  // 查询摆卡记录 193
  const punchPair = await prisma.punchPair.findUnique({
    where: { id: 193 },
  });

  if (!punchPair) {
    console.log('摆卡记录 193 不存在');
    return;
  }

  // 查询班次信息
  const shift = await prisma.shift.findUnique({
    where: { id: punchPair.shiftId! },
    include: {
      segments: {
        orderBy: { startTime: 'asc' },
      },
    },
  });

  // 查询排班信息
  const employee = await prisma.employee.findFirst({
    where: { employeeNo: punchPair.employeeNo },
  });

  const dayStart = new Date(punchPair.pairDate);
  dayStart.setHours(0, 0, 0, 0);

  const schedule = await prisma.schedule.findFirst({
    where: {
      employeeId: employee?.id,
      scheduleDate: dayStart,
      shiftId: punchPair.shiftId,
    },
  });

  // 解析班段转移账户映射表
  const segmentTransferMap = new Map<number, number>();
  if (schedule?.adjustedSegments) {
    try {
      const adjustedSegments = JSON.parse(schedule.adjustedSegments);
      adjustedSegments.forEach((seg: any) => {
        if (seg.id && seg.accountId) {
          segmentTransferMap.set(seg.id, seg.accountId);
        }
      });
    } catch (error) {
      console.warn('解析adjustedSegments失败:', error);
    }
  }

  console.log('1. 输入参数:');
  console.log(`   摆卡ID: ${punchPair.id}`);
  console.log(`   员工: ${punchPair.employeeNo}`);
  console.log(`   打卡时间: ${punchPair.inPunchTime?.toISOString()} ~ ${punchPair.outPunchTime?.toISOString()}`);
  console.log(`   摆卡账户ID: ${punchPair.accountId}`);

  console.log('\n2. 班次信息:');
  console.log(`   班次ID: ${shift?.id}, 名称: ${shift?.name}`);
  if (shift?.segments) {
    shift.segments.forEach((seg, idx) => {
      const segStart = parseSegmentTime(punchPair.pairDate, seg.startDate, seg.startTime);
      const segEnd = parseSegmentTime(punchPair.pairDate, seg.endDate, seg.endTime);
      console.log(`   段${idx + 1}: ${seg.startDate} ${seg.startTime} ~ ${seg.endDate} ${seg.endTime}`);
      console.log(`     实际时间: ${segStart.toISOString()} ~ ${segEnd.toISOString()}`);
      console.log(`     类型: ${seg.type}, ID: ${seg.id}`);
      const transferAccountId = segmentTransferMap.get(seg.id);
      console.log(`     转移账户ID: ${transferAccountId || 'null'}`);
    });
  }

  // 执行时间拆分
  console.log('\n3. 执行时间拆分 (splitTimeBySegments):');
  const inTime = new Date(punchPair.inPunchTime!);
  const outTime = new Date(punchPair.outPunchTime!);

  if (!shift || !shift.segments || shift.segments.length === 0) {
    console.log('   无班次信息，返回整个时间段');
    return;
  }

  // 获取所有工作班段（非休息段）
  const workSegments = shift.segments.filter((s) => s.type !== 'REST');
  console.log(`   工作班段数量: ${workSegments.length}`);

  if (workSegments.length === 0) {
    console.log('   无工作班段');
    return;
  }

  // 找出第一个班段的开始时间和最后一个班段的结束时间
  const firstSegmentStart = parseSegmentTime(punchPair.pairDate, workSegments[0].startDate, workSegments[0].startTime);
  const lastSegmentEnd = parseSegmentTime(punchPair.pairDate, workSegments[workSegments.length - 1].startDate, workSegments[workSegments.length - 1].endTime);

  console.log(`   班次时间范围: ${firstSegmentStart.toISOString()} ~ ${lastSegmentEnd.toISOString()}`);

  // 先收集所有时间段
  const timeSegments: Array<{ startTime: Date; endTime: Date; transferAccountId: number | null }> = [];

  // 班前时间
  if (inTime < firstSegmentStart) {
    const outsideEnd = outTime < firstSegmentStart ? outTime : firstSegmentStart;
    if (outsideEnd > inTime) {
      timeSegments.push({
        startTime: inTime,
        endTime: outsideEnd,
        transferAccountId: null,
      });
      console.log(`   班前时间: ${inTime.toISOString()} ~ ${outsideEnd.toISOString()}, 转移账户: null`);
    }
  }

  // 班次内的时间段
  for (const segment of workSegments) {
    // 计算班段的开始和结束时间
    const segmentStartTime = parseSegmentTime(punchPair.pairDate, segment.startDate, segment.startTime);
    const segmentEndTime = parseSegmentTime(punchPair.pairDate, segment.endDate, segment.endTime);

    // 计算打卡时间与班段时间的交集
    const overlapStart = inTime > segmentStartTime ? inTime : segmentStartTime;
    const overlapEnd = outTime < segmentEndTime ? outTime : segmentEndTime;

    if (overlapStart >= overlapEnd) {
      console.log(`   段${segment.id} (${segment.startTime}~${segment.endTime}): 无交集`);
      continue;
    }

    // 获取该班段的转移账户ID
    const transferAccountId = segmentTransferMap.get(segment.id) || null;

    const hours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
    console.log(`   段${segment.id} (${segment.startTime}~${segment.endTime}): 交集 ${overlapStart.toISOString()} ~ ${overlapEnd.toISOString()}, 工时: ${hours.toFixed(2)}h, 转移账户: ${transferAccountId || 'null'}`);

    timeSegments.push({
      startTime: overlapStart,
      endTime: overlapEnd,
      transferAccountId: transferAccountId,
    });
  }

  // 班后时间
  if (outTime > lastSegmentEnd) {
    const outsideStart = inTime > lastSegmentEnd ? inTime : lastSegmentEnd;
    if (outTime > outsideStart) {
      timeSegments.push({
        startTime: outsideStart,
        endTime: outTime,
        transferAccountId: null,
      });
      console.log(`   班后时间: ${outsideStart.toISOString()} ~ ${outTime.toISOString()}, 转移账户: null`);
    }
  }

  // 合并相邻的、具有相同转移账户的时间段
  console.log('\n4. 合并相同转移账户的时间段:');
  const mergedSegments: Array<{ startTime: Date; endTime: Date; transferAccountId: number | null }> = [];
  let currentSegment = timeSegments[0];

  for (let i = 1; i < timeSegments.length; i++) {
    const nextSegment = timeSegments[i];

    if (currentSegment.transferAccountId === nextSegment.transferAccountId) {
      console.log(`   合并: ${currentSegment.transferAccountId} 段`);
      currentSegment = {
        startTime: currentSegment.startTime,
        endTime: nextSegment.endTime,
        transferAccountId: currentSegment.transferAccountId,
      };
    } else {
      console.log(`   新段: 转移账户 ${currentSegment.transferAccountId} -> ${nextSegment.transferAccountId}`);
      mergedSegments.push(currentSegment);
      currentSegment = nextSegment;
    }
  }
  mergedSegments.push(currentSegment);

  console.log('\n5. 最终时间段:');
  mergedSegments.forEach((seg, idx) => {
    const hours = (seg.endTime.getTime() - seg.startTime.getTime()) / (1000 * 60 * 60);
    console.log(`   段${idx + 1}: ${seg.startTime.toISOString()} ~ ${seg.endTime.toISOString()}, 工时: ${hours.toFixed(2)}h, 转移账户: ${seg.transferAccountId || 'null'}`);
  });

  // 查询实际生成的工时结果
  console.log('\n6. 实际生成的工时结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: punchPair.employeeNo,
      calcDate: punchPair.pairDate,
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  calcResults.forEach((result, idx) => {
    console.log(`   结果${idx + 1}: ${result.punchInTime?.toISOString()} ~ ${result.punchOutTime?.toISOString()}, 工时: ${result.actualHours}h, 账户: ${result.accountName || 'null'}, 代码: ${result.calculationAttendanceCode?.name || 'null'}`);
  });
}

main()
  .then(() => console.log('\n调试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
