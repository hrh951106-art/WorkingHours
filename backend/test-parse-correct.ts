// 正确的测试方法

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
  console.log('=== 测试 parseSegmentTime（本地时区 UTC+8） ===\n');

  // 注意：这里应该使用本地日期，而不是 UTC 日期
  // 如果 calcDate 是 2026-05-12，那么 baseDate 应该是本地时间的 2026-05-12 00:00:00
  const baseDate = new Date(2026, 4, 12, 0, 0, 0, 0); // 本地时间 2026-05-12 00:00:00

  console.log('baseDate (本地时间):', baseDate.toString());
  console.log('baseDate (UTC):', baseDate.toISOString());
  console.log('');

  const testCases = [
    { startDate: '+0', time: '08:00', desc: '段1开始' },
    { startDate: '+0', time: '12:00', desc: '段1结束' },
    { startDate: '+0', time: '14:00', desc: '段2开始' },
    { startDate: '+0', time: '19:00', desc: '段2结束' },
  ];

  console.log('测试结果:');
  testCases.forEach((tc) => {
    const result = parseSegmentTimeFixed(baseDate, tc.startDate, tc.time);
    console.log(`  ${tc.desc}: ${tc.startDate} ${tc.time}`);
    console.log(`    本地时间: ${result.toString()}`);
    console.log(`    UTC: ${result.toISOString()}`);
    console.log('');
  });
}

main();
