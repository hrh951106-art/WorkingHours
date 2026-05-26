import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toLocalTime(date: Date | null): string {
  if (!date) return 'null';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function main() {
  console.log('=== 测试和修复考勤摆卡日期问题 ===\n');

  const employeeNo = '202604003';

  // 1. 检查当前的问题数据
  console.log('1. 检查当前的考勤摆卡数据:\n');
  const allRecords = await prisma.attendancePunchPair.findMany({
    where: { employeeNo },
    orderBy: { punchDate: 'asc' },
  });

  console.log(`总共 ${allRecords.length} 条记录\n`);

  const problems: any[] = [];
  allRecords.forEach((record) => {
    const punchDate = record.punchDate.toISOString().split('T')[0];
    const actualDate = record.workStartPunchTime?.toISOString().split('T')[0] || 'null';

    if (punchDate !== actualDate) {
      problems.push({
        id: record.id,
        punchDate: punchDate,
        actualDate: actualDate,
        correctPunchDate: actualDate,
      });
    }
  });

  console.log(`发现 ${problems.length} 条记录存在日期不匹配:\n`);
  problems.forEach((p) => {
    console.log(`  ID=${p.id}: punchDate=${p.punchDate}, 应该是=${p.correctPunchDate}`);
  });

  if (problems.length === 0) {
    console.log('✓ 所有记录的日期都正确！');
    return;
  }

  // 2. 修复方案
  console.log('\n2. 修复方案:\n');
  console.log('  选项A: 删除错误的考勤摆卡记录，重新执行收卡');
  console.log('  选项B: 直接更新 punchDate 字段（快速修复）');
  console.log('\n推荐使用选项A，因为重新收卡可以确保数据一致性');

  // 3. 执行修复（选项B：直接更新）
  console.log('\n3. 执行快速修复（直接更新 punchDate）:\n');

  for (const problem of problems) {
    const [year, month, day] = problem.correctPunchDate.split('-').map(Number);
    const correctDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    await prisma.attendancePunchPair.update({
      where: { id: problem.id },
      data: { punchDate: correctDate },
    });

    console.log(`  ✓ ID=${problem.id}: ${problem.punchDate} → ${problem.correctPunchDate}`);
  }

  console.log('\n修复完成！');

  // 4. 验证修复结果
  console.log('\n4. 验证修复结果:\n');
  const updatedRecords = await prisma.attendancePunchPair.findMany({
    where: { employeeNo },
    orderBy: { punchDate: 'asc' },
  });

  let allCorrect = true;
  updatedRecords.forEach((record) => {
    const punchDate = record.punchDate.toISOString().split('T')[0];
    const actualDate = record.workStartPunchTime?.toISOString().split('T')[0] || 'null';

    const match = punchDate === actualDate;
    if (!match) {
      allCorrect = false;
      console.log(`  ❌ ID=${record.id}: punchDate=${punchDate}, 实际=${actualDate}`);
    }
  });

  if (allCorrect) {
    console.log('  ✓ 所有记录的日期现在都正确了！');
  } else {
    console.log('  ⚠️  仍有记录日期不匹配，请手动检查');
  }

  // 5. 显示修复后的数据
  console.log('\n5. 修复后的考勤摆卡数据:\n');
  const recordsByDate = new Map<string, typeof allRecords>();
  updatedRecords.forEach((record) => {
    const dateStr = record.punchDate.toISOString().split('T')[0];
    if (!recordsByDate.has(dateStr)) {
      recordsByDate.set(dateStr, []);
    }
    recordsByDate.get(dateStr)!.push(record);
  });

  for (const [dateStr, records] of recordsByDate.entries()) {
    console.log(`日期: ${dateStr} (${records.length} 条记录)`);
    records.forEach((record, idx) => {
      const startTime = toLocalTime(record.workStartPunchTime);
      const endTime = toLocalTime(record.workEndPunchTime);
      console.log(`  ${idx + 1}. ${startTime} ~ ${endTime}`);
    });
    console.log('');
  }
}

main()
  .then(() => console.log('完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
