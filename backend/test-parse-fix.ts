// 测试修复后的 parseSegmentTime 函数

function parseSegmentTimeFixed(baseDate: Date, startDate: string, timeStr: string): Date {
  // 将 baseDate 转换为本地时间的 00:00:00
  const result = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);

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
  console.log('=== 测试修复后的 parseSegmentTime ===\n');

  const baseDate = new Date('2026-05-12T00:00:00.000Z');

  console.log('baseDate:', baseDate.toISOString());
  console.log('');

  const testCases = [
    { startDate: '+0', time: '08:00', expected: '2026-05-12T08:00:00.000Z' },
    { startDate: '+0', time: '12:00', expected: '2026-05-12T12:00:00.000Z' },
    { startDate: '+0', time: '14:00', expected: '2026-05-12T14:00:00.000Z' },
    { startDate: '+0', time: '19:00', expected: '2026-05-12T19:00:00.000Z' },
  ];

  console.log('测试结果:');
  testCases.forEach((tc) => {
    const result = parseSegmentTimeFixed(baseDate, tc.startDate, tc.time);
    const passed = result.toISOString() === tc.expected;
    console.log(`  ${tc.startDate} ${tc.time} -> ${result.toISOString()} ${passed ? '✓' : '✗ (期望: ' + tc.expected + ')'}`);
  });
}

main();
