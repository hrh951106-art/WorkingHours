// 测试修复后的 splitTimeBySegments 逻辑

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

function splitTimeBySegments(
  inTime: Date,
  outTime: Date,
  workSegments: any[],
  calcDate: Date
) {
  const timeSegments = [];

  // 步骤1: 计算打卡时间与每个班段的交集
  console.log('\n步骤1: 计算与每个班段的交集');
  for (const segment of workSegments) {
    const segmentStartTime = parseSegmentTime(calcDate, segment.startDate, segment.startTime);
    const segmentEndTime = parseSegmentTime(calcDate, segment.endDate, segment.endTime);

    const overlapStart = inTime > segmentStartTime ? inTime : segmentStartTime;
    const overlapEnd = outTime < segmentEndTime ? outTime : segmentEndTime;

    if (overlapStart < overlapEnd) {
      const transferAccountId = segment.id === 13 ? 18 : null; // 段2的转移账户
      timeSegments.push({
        startTime: overlapStart,
        endTime: overlapEnd,
        transferAccountId: transferAccountId,
      });
      console.log(`  段${segment.id}: 交集 ${overlapStart.toISOString()} ~ ${overlapEnd.toISOString()}, 转移账户: ${transferAccountId || 'null'}`);
    }
  }

  // 步骤2: 计算班外时间（不在任何班段内的时间）
  console.log('\n步骤2: 计算班外时间');
  const insideSegments = timeSegments
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  console.log(`  班内时间段数量: ${insideSegments.length}`);

  let currentTime = inTime;
  console.log(`  初始 currentTime: ${currentTime.toISOString()}`);

  for (const segment of insideSegments) {
    console.log(`  处理段: ${segment.startTime.toISOString()} ~ ${segment.endTime.toISOString()}`);
    console.log(`    currentTime (${currentTime.toISOString()}) < segment.startTime (${segment.startTime.toISOString()})? ${currentTime < segment.startTime}`);

    if (currentTime < segment.startTime) {
      const hours = ((segment.startTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60));
      console.log(`    添加班外时间: ${currentTime.toISOString()} ~ ${segment.startTime.toISOString()}, 工时: ${hours.toFixed(2)}h`);
      timeSegments.push({
        startTime: currentTime,
        endTime: segment.startTime,
        transferAccountId: null,
      });
    }
    currentTime = segment.endTime > currentTime ? segment.endTime : currentTime;
    console.log(`    更新 currentTime: ${currentTime.toISOString()}`);
  }

  console.log(`  currentTime (${currentTime.toISOString()}) < outTime (${outTime.toISOString()})? ${currentTime < outTime}`);
  if (currentTime < outTime) {
    const hours = ((outTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60));
    console.log(`  添加班外时间: ${currentTime.toISOString()} ~ ${outTime.toISOString()}, 工时: ${hours.toFixed(2)}h`);
    timeSegments.push({
      startTime: currentTime,
      endTime: outTime,
      transferAccountId: null,
    });
  }

  console.log('\n最终时间段:');
  timeSegments
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .forEach((seg, idx) => {
      const hours = ((seg.endTime.getTime() - seg.startTime.getTime()) / (1000 * 60 * 60));
      console.log(`  段${idx + 1}: ${seg.startTime.toISOString()} ~ ${seg.endTime.toISOString()}, 工时: ${hours.toFixed(2)}h, 转移账户: ${seg.transferAccountId || 'null'}`);
    });

  return timeSegments;
}

async function main() {
  console.log('=== 测试修复后的 splitTimeBySegments ===\n');

  const calcDate = new Date('2026-05-12T00:00:00.000Z');
  const inTime = new Date('2026-05-12T04:30:00.000Z');
  const outTime = new Date('2026-05-12T09:00:00.000Z');

  console.log('输入参数:');
  console.log(`  calcDate: ${calcDate.toISOString()}`);
  console.log(`  inTime: ${inTime.toISOString()}`);
  console.log(`  outTime: ${outTime.toISOString()}`);

  const workSegments = [
    { id: 12, startDate: '+0', startTime: '08:00', endDate: '+0', endTime: '12:00', type: 'NORMAL' },
    { id: 13, startDate: '+0', startTime: '14:00', endDate: '+0', endTime: '19:00', type: 'NORMAL' },
  ];

  const result = splitTimeBySegments(inTime, outTime, workSegments, calcDate);
}

main();
