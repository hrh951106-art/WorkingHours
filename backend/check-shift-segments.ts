import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查班段数据 ===\n');

  // 1. 查询班次 2 的班段数据
  const segments = await prisma.shiftSegment.findMany({
    where: { shiftId: 2 },
    orderBy: { startTime: 'asc' },
  });

  console.log('班次 2 的班段数据:');
  segments.forEach((seg) => {
    console.log(`ID: ${seg.id}`);
    console.log(`  startDate: ${seg.startDate}`);
    console.log(`  startTime: ${seg.startTime}`);
    console.log(`  endDate: ${seg.endDate}`);
    console.log(`  endTime: ${seg.endTime}`);
    console.log(`  type: ${seg.type}`);
    console.log('');
  });

  // 2. 测试 parseSegmentTime 函数
  console.log('测试 parseSegmentTime 函数:');
  const baseDate = new Date('2026-05-12T00:00:00.000Z');

  const testParse = (startDate: string, timeStr: string) => {
    const result = new Date(baseDate);
    const [hours, minutes] = timeStr.split(':').map(Number);

    if (startDate === '+0') {
      result.setHours(hours, minutes, 0, 0);
    } else if (startDate === '+1') {
      result.setDate(result.getDate() + 1);
      result.setHours(hours, minutes, 0, 0);
    }

    console.log(`  ${startDate} ${timeStr} -> ${result.toISOString()}`);
    return result;
  };

  testParse('+0', '08:00');
  testParse('+0', '12:00');
  testParse('+0', '14:00');
  testParse('+0', '19:00');

  // 3. 检查 baseDate 的值
  console.log('\nbaseDate 详情:');
  console.log(`  baseDate: ${baseDate.toISOString()}`);
  console.log(`  baseDate.getHours(): ${baseDate.getHours()}`);

  // 4. 手动测试 setHours
  console.log('\n手动测试 setHours:');
  const testDate1 = new Date('2026-05-12T00:00:00.000Z');
  console.log(`  原始: ${testDate1.toISOString()}`);
  testDate1.setHours(8, 0, 0, 0);
  console.log(`  setHours(8, 0, 0, 0): ${testDate1.toISOString()}`);

  const testDate2 = new Date('2026-05-12T00:00:00.000Z');
  testDate2.setHours(14, 0, 0, 0);
  console.log(`  setHours(14, 0, 0, 0): ${testDate2.toISOString()}`);
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
