import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

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
  console.log('=== 测试考勤摆卡时间交叉修复 ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00.000Z');

  // 1. 删除5月9日的旧考勤摆卡记录
  console.log('1. 删除旧的考勤摆卡记录:');
  const deleteResult = await prisma.attendancePunchPair.deleteMany({
    where: {
      employeeNo,
      punchDate: targetDate,
    },
  });
  console.log(`   删除了 ${deleteResult.count} 条记录`);

  // 2. 查询打卡记录
  console.log('\n2. 查询打卡记录:');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      employeeNo,
      punchTime: {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log(`   找到 ${punchRecords.length} 条打卡记录:`);
  punchRecords.forEach((punch) => {
    const time = toLocalTime(punch.punchTime);
    console.log(`     ${time} ${punch.punchType} (ID: ${punch.id})`);
  });

  // 3. 使用API重新收卡
  console.log('\n3. 调用API重新收卡:');

  try {
    const response = await fetch('http://localhost:3011/api/punch/attendance-punch/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo',
      },
      body: JSON.stringify({
        employeeNos: [employeeNo],
        punchDate: '2026-05-09',
      }),
    });

    const result = await response.json();
    console.log(`   API响应状态: ${response.status}`);
    console.log(`   API响应:`, JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log(`   ⚠️  API调用失败: ${error.message}`);
    console.log(`   请确保后端服务器正在运行（npm run start:dev）`);
    console.log(`   您也可以手动在前端触发收卡操作`);
  }

  // 4. 查询新的考勤摆卡结果
  console.log('\n4. 查询新的考勤摆卡结果:');
  const newRecords = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: targetDate,
    },
    orderBy: { workStartPunchTime: 'asc' },
  });

  if (newRecords.length === 0) {
    console.log('   没有找到新的考勤摆卡记录（API调用可能失败）');
    return;
  }

  console.log(`   找到 ${newRecords.length} 条记录:\n`);

  newRecords.forEach((record, idx) => {
    const startTime = toLocalTime(record.workStartPunchTime);
    const endTime = toLocalTime(record.workEndPunchTime);
    const workHours = record.workStartPunchTime && record.workEndPunchTime
      ? ((record.workEndPunchTime.getTime() - record.workStartPunchTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
      : '0';

    console.log(`   记录${idx + 1} (ID: ${record.id}):`);
    console.log(`     时间: ${startTime} ~ ${endTime}`);
    console.log(`     工时: ${workHours}h`);

    // 显示使用的打卡卡
    if (record.workStartPunches) {
      try {
        const startPunches = JSON.parse(record.workStartPunches);
        console.log(`     上班卡 (${startPunches.length}笔):`);
        startPunches.forEach((p: any) => {
          const time = toLocalTime(new Date(p.punchTime));
          console.log(`       - ${time} (ID: ${p.id})`);
        });
      } catch (e) {}
    }

    if (record.workEndPunches) {
      try {
        const endPunches = JSON.parse(record.workEndPunches);
        console.log(`     下班卡 (${endPunches.length}笔):`);
        endPunches.forEach((p: any) => {
          const time = toLocalTime(new Date(p.punchTime));
          console.log(`       - ${time} (ID: ${p.id})`);
        });
      } catch (e) {}
    }

    console.log('');
  });

  // 5. 检查时间交叉
  console.log('5. 检查时间交叉:');
  let hasOverlap = false;
  for (let i = 0; i < newRecords.length - 1; i++) {
    const current = newRecords[i];
    const next = newRecords[i + 1];

    if (current.workEndPunchTime && next.workStartPunchTime) {
      const overlap = current.workEndPunchTime > next.workStartPunchTime;
      const gap = current.workEndPunchTime < next.workStartPunchTime;

      if (overlap) {
        const overlapMinutes = (current.workEndPunchTime.getTime() - next.workStartPunchTime.getTime()) / (1000 * 60);
        console.log(`   ❌ 记录${i + 1}与记录${i + 2}交叉: ${overlapMinutes.toFixed(0)} 分钟`);
        console.log(`      记录${i + 1}: ${toLocalTime(current.workStartPunchTime)} ~ ${toLocalTime(current.workEndPunchTime)}`);
        console.log(`      记录${i + 2}: ${toLocalTime(next.workStartPunchTime)} ~ ${toLocalTime(next.workEndPunchTime)}`);
        hasOverlap = true;
      } else if (gap) {
        const gapMinutes = (next.workStartPunchTime.getTime() - current.workEndPunchTime.getTime()) / (1000 * 60);
        console.log(`   ✓ 记录${i + 1}与记录${i + 2}间隔: ${gapMinutes.toFixed(0)} 分钟`);
      } else {
        console.log(`   ✓ 记录${i + 1}与记录${i + 2}连续`);
      }
    }
  }

  if (!hasOverlap && newRecords.length > 1) {
    console.log('\n✓ 没有发现时间交叉，修复成功！');
  } else if (newRecords.length <= 1) {
    console.log('\n只有一条记录，无需检查交叉');
  } else {
    console.log('\n⚠️  仍有时间交叉，可能需要进一步调整');
  }

  // 6. 检查打卡卡重复使用
  console.log('\n6. 检查打卡卡重复使用:');
  const usedPunchIds = new Set<number>();
  const duplicatePunchIds = new Set<number>();

  newRecords.forEach((record) => {
    const allPunches: number[] = [];

    if (record.workStartPunches) {
      try {
        const startPunches = JSON.parse(record.workStartPunches);
        startPunches.forEach((p: any) => allPunches.push(p.id));
      } catch (e) {}
    }

    if (record.workEndPunches) {
      try {
        const endPunches = JSON.parse(record.workEndPunches);
        endPunches.forEach((p: any) => allPunches.push(p.id));
      } catch (e) {}
    }

    allPunches.forEach((punchId) => {
      if (usedPunchIds.has(punchId)) {
        duplicatePunchIds.add(punchId);
      }
      usedPunchIds.add(punchId);
    });
  });

  if (duplicatePunchIds.size > 0) {
    console.log(`   ❌ 发现 ${duplicatePunchIds.size} 张打卡卡被重复使用:`);
    duplicatePunchIds.forEach((punchId) => {
      const punch = punchRecords.find((p) => p.id === punchId);
      if (punch) {
        const time = toLocalTime(punch.punchTime);
        console.log(`      - 打卡ID ${punchId}: ${time} ${punch.punchType}`);
      }
    });
  } else {
    console.log(`   ✓ 没有发现打卡卡被重复使用`);
  }
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
