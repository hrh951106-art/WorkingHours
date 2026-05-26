// 验证日期解析修复

console.log('=== 验证日期解析修复 ===\n');

// 模拟前端传递的数据
const punchDate = '2026-05-09';

// ❌ 旧方法（有 bug）
const oldMethod = new Date(punchDate);
console.log('❌ 旧方法: new Date("2026-05-09")');
console.log('   ISO 字符串:', oldMethod.toISOString());
console.log('   本地时间:', oldMethod.toString());
console.log('   getFullYear():', oldMethod.getFullYear());
console.log('   getMonth():', oldMethod.getMonth());
console.log('   getDate():', oldMethod.getDate());
console.log('   问题: UTC 时间 00:00:00 在 UTC+8 时区显示为 08:00:00');

// ✅ 新方法（已修复）
const newMethod = new Date(punchDate + 'T00:00:00');
console.log('\n✅ 新方法: new Date("2026-05-09T00:00:00")');
console.log('   ISO 字符串:', newMethod.toISOString());
console.log('   本地时间:', newMethod.toString());
console.log('   getFullYear():', newMethod.getFullYear());
console.log('   getMonth():', newMethod.getMonth());
console.log('   getDate():', newMethod.getDate());
console.log('   正确: 本地时间 00:00:00');

// 验证日期一致性
console.log('\n=== 验证结果 ===');
const inputDate = '2026-05-09';
const [year, month, day] = inputDate.split('-').map(Number);

const fixedDate = new Date(inputDate + 'T00:00:00');
const isYearMatch = fixedDate.getFullYear() === year;
const isMonthMatch = fixedDate.getMonth() === month - 1;
const isDayMatch = fixedDate.getDate() === day;

console.log(`输入日期: ${inputDate}`);
console.log(`解析结果: ${fixedDate.getFullYear()}-${String(fixedDate.getMonth() + 1).padStart(2, '0')}-${String(fixedDate.getDate()).padStart(2, '0')}`);
console.log(`年份匹配: ${isYearMatch ? '✓' : '❌'}`);
console.log(`月份匹配: ${isMonthMatch ? '✓' : '❌'}`);
console.log(`日期匹配: ${isDayMatch ? '✓' : '❌'}`);
console.log(`\n修复${isYearMatch && isMonthMatch && isDayMatch ? '成功' : '失败'}！`);
