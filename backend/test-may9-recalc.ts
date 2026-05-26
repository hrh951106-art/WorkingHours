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
  console.log('=== 测试5月9日考勤摆卡收卡（修复后的逻辑） ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00.000Z');

  // 1. 班次信息
  console.log('1. 班次配置:');
  console.log('  段1: 08:00 ~ 12:00 (NORMAL - 工作)');
  console.log('  段2: 12:00 ~ 13:30 (REST - 休息)');
  console.log('  段3: 13:30 ~ 17:30 (NORMAL - 工作)');
  console.log('');
  console.log('  预期行为: 段1和段3间隔90分钟 < 阈值120分钟，判定为连续');
  console.log('  预期收卡: 只收1对卡（首尾两笔）');

  // 2. 打卡记录
  console.log('\n2. 实际打卡记录:');
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

  punchRecords.forEach((punch) => {
    const time = toLocalTime(punch.punchTime);
    console.log(`  ${time} ${punch.punchType} (ID: ${punch.id})`);
  });

  console.log('\n  预期收卡:');
  console.log(`    上班卡: 08:00 IN (ID: 20)`);
  console.log(`    下班卡: 17:30 附近的卡，实际是 18:00 OUT (ID: 24)`);
  console.log(`    结果: 08:00 ~ 18:00 (10小时)`);

  // 3. 调用API收卡
  console.log('\n3. 调用API执行收卡:');

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
    console.log(`   状态: ${response.status}`);
    if (response.ok) {
      console.log(`   ✓ 收卡成功`);
    } else {
      console.log(`   ⚠️  收卡失败:`, result);
    }
  } catch (error: any) {
    console.log(`   ⚠️  API调用失败: ${error.message}`);
    console.log(`   请确保后端服务器正在运行（npm run start:dev）`);
    console.log(`   或者手动在前端触发收卡操作`);
  }

  // 4. 查询收卡结果
  console.log('\n4. 查询收卡结果:');
  const attendancePairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: targetDate,
    },
    orderBy: { workStartPunchTime: 'asc' },
  });

  if (attendancePairs.length === 0) {
    console.log('   没有找到考勤摆卡记录');
    console.log('   可能API调用失败，请检查后端服务器状态');
    return;
  }

  console.log(`   找到 ${attendancePairs.length} 条记录\n`);

  attendancePairs.forEach((record, idx) => {
    const startTime = toLocalTime(record.workStartPunchTime);
    const endTime = toLocalTime(record.workEndPunchTime);
    const workHours = record.workStartPunchTime && record.workEndPunchTime
      ? ((record.workEndPunchTime.getTime() - record.workStartPunchTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
      : '0';

    console.log(`   记录${idx + 1} (ID: ${record.id}):`);
    console.log(`     时间: ${startTime} ~ ${endTime}`);
    console.log(`     工时: ${workHours}h`);
    console.log(`     连续班次: ${record.isContinuousShift ? '是' : '否'}`);

    // 显示使用的打卡卡
    if (record.workStartPunches) {
      try {
        const startPunches = JSON.parse(record.workStartPunches);
        console.log(`     上班卡: ${startPunches.map((p: any) => toLocalTime(new Date(p.punchTime))).join(', ')}`);
      } catch (e) {}
    }

    if (record.workEndPunches) {
      try {
        const endPunches = JSON.parse(record.workEndPunches);
        console.log(`     下班卡: ${endPunches.map((p: any) => toLocalTime(new Date(p.punchTime))).join(', ')}`);
      } catch (e) {}
    }

    console.log('');
  });

  // 5. 验证结果
  console.log('5. 验证结果:');

  if (attendancePairs.length === 1) {
    const record = attendancePairs[0];
    const startTime = toLocalTime(record.workStartPunchTime);
    const endTime = toLocalTime(record.workEndPunchTime);

    const expectedStart = '2026-05-09 08:00';
    const expectedEndAround = '2026-05-09 17:30';
    const actualEnd = endTime.split(' ')[1];

    console.log(`   预期: 1条记录`);
    console.log(`   实际: ${attendancePairs.length}条记录 ✓`);
    console.log('');
    console.log(`   预期上班卡: ${expectedStart}`);
    console.log(`   实际上班卡: ${startTime}`);
    console.log(`   上班卡匹配: ${startTime.includes('08:00') ? '✓' : '❌'}`);
    console.log('');
    console.log(`   预期下班卡: ${expectedEndAround} 附近`);
    console.log(`   实际下班卡: ${endTime}`);
    console.log(`   下班卡合理: ${actualEnd >= '17:30' && actualEnd <= '18:30' ? '✓' : '❌'}`);
    console.log('');

    if (startTime.includes('08:00') && actualEnd >= '17:30' && actualEnd <= '18:30') {
      console.log(`   ✅ 修复成功！收卡结果符合预期`);
    } else {
      console.log(`   ⚠️  收卡结果与预期不完全一致`);
    }
  } else {
    console.log(`   ❌ 预期1条记录，实际${attendancePairs.length}条`);
    console.log(`   可能原因: 连续性判断未生效，仍然判定为不连续`);
  }

  // 6. 检查时间交叉
  if (attendancePairs.length > 1) {
    console.log('\n6. 检查时间交叉:');
    let hasOverlap = false;
    for (let i = 0; i < attendancePairs.length - 1; i++) {
      const current = attendancePairs[i];
      const next = attendancePairs[i + 1];

      if (current.workEndPunchTime && next.workStartPunchTime) {
        const overlap = current.workEndPunchTime > next.workStartPunchTime;
        if (overlap) {
          const overlapMinutes = (current.workEndPunchTime.getTime() - next.workStartPunchTime.getTime()) / (1000 * 60);
          console.log(`   ❌ 记录${i + 1}与记录${i + 2}交叉: ${overlapMinutes.toFixed(0)} 分钟`);
          hasOverlap = true;
        }
      }
    }

    if (!hasOverlap) {
      console.log(`   ✓ 没有发现时间交叉`);
    }
  }
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
