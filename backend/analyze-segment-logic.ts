// 分析摆卡193的时间拆分逻辑

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

async function main() {
  console.log('=== 分析摆卡193的时间拆分逻辑 ===\n');

  const calcDate = new Date('2026-05-12T00:00:00.000Z');
  const inTime = new Date('2026-05-12T04:30:00.000Z');
  const outTime = new Date('2026-05-12T09:00:00.000Z');

  console.log('1. 输入参数:');
  console.log(`   calcDate: ${calcDate.toISOString()}`);
  console.log(`   inTime: ${inTime.toISOString()}`);
  console.log(`   outTime: ${outTime.toISOString()}`);

  // 模拟班段数据
  const workSegments = [
    { id: 12, startDate: '+0', startTime: '08:00', endDate: '+0', endTime: '12:00', type: 'NORMAL' },
    { id: 13, startDate: '+0', startTime: '14:00', endDate: '+0', endTime: '19:00', type: 'NORMAL' },
  ];

  console.log('\n2. 班段配置:');
  workSegments.forEach((seg, idx) => {
    const segStart = parseSegmentTime(calcDate, seg.startDate, seg.startTime);
    const segEnd = parseSegmentTime(calcDate, seg.endDate, seg.endTime);
    console.log(`   段${idx + 1}: ${seg.startDate} ${seg.startTime} ~ ${seg.endDate} ${seg.endTime}`);
    console.log(`     UTC: ${segStart.toISOString()} ~ ${segEnd.toISOString()}`);
  });

  // 解析所有班段时间段
  const allSegmentRanges = workSegments.map(seg => {
    const start = parseSegmentTime(calcDate, seg.startDate, seg.startTime);
    const end = parseSegmentTime(calcDate, seg.endDate, seg.endTime);
    return { start, end, segmentId: seg.id };
  });

  console.log('\n3. 时间轴分析:');
  console.log(`   00:00 ━━━━━━━━━━━━━━━━━━ 段1 ━━━━━━━━━━━━━━━━━━ 04:00`);
  console.log(`   04:00 ━━━━━━━━━━━━━━━━━━ 间隔 ━━━━━━━━━━━━━━━━━━ 06:00`);
  console.log(`   06:00 ━━━━━━━━━━━━━━━━━━ 段2 ━━━━━━━━━━━━━━━━━━ 11:00`);
  console.log(`   04:30 ●━━━━━━━━━━━━━━━━━━ 打卡时间 ━━━━━━━━━━━━━━━━ 09:00 ●`);

  console.log('\n4. 时间拆分期望结果:');
  console.log(`   段1: 04:30 ~ 09:00 与 段1(00:00~04:00) 的交集: 无`);
  console.log(`   段2: 04:30 ~ 09:00 与 段2(06:00~11:00) 的交集: 06:00 ~ 09:00 ✓`);
  console.log(`   班前: 04:30 ~ 06:00 (不在任何班段内) ✓`);

  console.log('\n5. 当前算法的问题:');
  console.log(`   问题: 班前时间判断条件 inTime < firstSegmentStart (04:30 < 00:00) 为 false`);
  console.log(`   结果: 班前时间 04:30 ~ 06:00 被丢弃 ✗`);

  console.log('\n6. 修复方案:');
  console.log(`   方案: 不单独判断班前时间，而是将整个打卡时间范围与所有班段求交集`);
  console.log(`   逻辑: `);
  console.log(`   1. 计算打卡时间与每个班段的交集，加入 timeSegments`);
  console.log(`   2. 计算打卡时间与所有班段并集的差集（即不在任何班段内的时间），加入 timeSegments`);
  console.log(`   3. 合并相同转移账户的时间段`);

  // 实现修复后的逻辑
  console.log('\n7. 修复后的算法执行:');

  const timeSegments = [];

  // 班次内的时间段（与每个班段求交集）
  console.log('\n   步骤1: 计算与每个班段的交集');
  for (const segment of workSegments) {
    const segmentStartTime = parseSegmentTime(calcDate, segment.startDate, segment.startTime);
    const segmentEndTime = parseSegmentTime(calcDate, segment.endDate, segment.endTime);

    const overlapStart = inTime > segmentStartTime ? inTime : segmentStartTime;
    const overlapEnd = outTime < segmentEndTime ? outTime : segmentEndTime;

    if (overlapStart < overlapEnd) {
      timeSegments.push({
        startTime: overlapStart,
        endTime: overlapEnd,
        transferAccountId: segment.id === 13 ? 18 : null, // 段2的转移账户
        segmentId: segment.id,
      });
      console.log(`     段${segment.id}: 交集 ${overlapStart.toISOString()} ~ ${overlapEnd.toISOString()}`);
    }
  }

  // 班外时间（不在任何班段内的时间）
  console.log('\n   步骤2: 计算班外时间');
  let currentTime = inTime;
  for (const segment of timeSegments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())) {
    if (currentTime < segment.startTime) {
      timeSegments.push({
        startTime: currentTime,
        endTime: segment.startTime,
        transferAccountId: null,
        isOutside: true,
      });
      console.log(`     班外: ${currentTime.toISOString()} ~ ${segment.startTime.toISOString()}`);
    }
    currentTime = segment.endTime;
  }

  if (currentTime < outTime) {
    timeSegments.push({
      startTime: currentTime,
      endTime: outTime,
      transferAccountId: null,
      isOutside: true,
    });
    console.log(`     班外: ${currentTime.toISOString()} ~ ${outTime.toISOString()}`);
  }

  console.log('\n8. 最终时间段:');
  timeSegments
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .forEach((seg, idx) => {
      const hours = ((seg.endTime.getTime() - seg.startTime.getTime()) / (1000 * 60 * 60));
      const type = seg.isOutside ? '班外' : '班内';
      const account = seg.transferAccountId || 'null';
      console.log(`   段${idx + 1}: ${seg.startTime.toISOString()} ~ ${seg.endTime.toISOString()}, ${type}, 工时: ${hours.toFixed(2)}h, 转移账户: ${account}`);
    });
}

main();
