// 测试日期解析的时区问题

console.log('=== 测试日期解析 ===\n');

// 模拟前端传递的日期
const inputDate = '2026-05-09';

// 方法1：直接使用 new Date()
const date1 = new Date(inputDate);
console.log('方法1: new Date("2026-05-09")');
console.log('  ISO字符串:', date1.toISOString());
console.log('  本地日期字符串:', date1.toString());
console.log('  UTC日期:', date1.getUTCDate(), '日', date1.getUTCHours(), '时');
console.log('  本地日期:', date1.getDate(), '日', date1.getHours(), '时');

// 方法2：使用本地时间构造
const year = parseInt(inputDate.split('-')[0]);
const month = parseInt(inputDate.split('-')[1]) - 1;
const day = parseInt(inputDate.split('-')[2]);
const date2 = new Date(year, month, day, 0, 0, 0, 0);
console.log('\n方法2: new Date(2026, 4, 9, 0, 0, 0, 0)');
console.log('  ISO字符串:', date2.toISOString());
console.log('  本地日期字符串:', date2.toString());
console.log('  UTC日期:', date2.getUTCDate(), '日', date2.getUTCHours(), '时');
console.log('  本地日期:', date2.getDate(), '日', date2.getHours(), '时');

// 方法3：使用 ISO 格式但添加时间
const date3 = new Date(inputDate + 'T00:00:00');
console.log('\n方法3: new Date("2026-05-09T00:00:00")');
console.log('  ISO字符串:', date3.toISOString());
console.log('  本地日期字符串:', date3.toString());
console.log('  UTC日期:', date3.getUTCDate(), '日', date3.getUTCHours(), '时');
console.log('  本地日期:', date3.getDate(), '日', date3.getHours(), '时');

console.log('\n=== 结论 ===');
console.log('方法1 会创建 UTC 时间 00:00:00，在 UTC+8 时区会导致日期偏移');
console.log('方法2 使用本地时间，不会有这个问题');
console.log('方法3 会被当作本地时间解析');
