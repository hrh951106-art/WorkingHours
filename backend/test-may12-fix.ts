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
  console.log('=== 测试 5月12日 时间交叉修复 ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-12T00:00:00.000Z');

  // 1. 显示预期行为
  console.log('1. 预期行为:');
  console.log('  排班: 段1 08:00~12:00, 段2 14:00~19:00 (间隔120分钟，不连续)');
  console.log('  打卡: 12:00 OUT, 12:30 IN (都在两个段的收卡范围内)');
  console.log('');
  console.log('  第一段收卡:');
  console.log('    - 上班卡: 08:00前后的卡（如果有的话）');
  console.log('    - 下班卡: 12:00和12:30都在范围内，取最后一笔 → 12:30');
  console.log('');
  console.log('  第二段收卡:');
  console.log('    - 上班卡: 12:00和12:30都在范围内，取第一笔 → 12:00');
  console.log('    - 但是！12:00 < 12:30（第一段下班卡时间）');
  console.log('    - 时间交叉，认为第二段缺上班卡');
  console.log('');
  console.log('  预期结果:');
  console.log('    - 第一段: 08:00 ~ 12:30');
  console.log('    - 第二段: 缺上班卡 ~ 19:00');
  console.log('');

  // 2. 执行收卡
  console.log('2. 执行收卡:');
  console.log('  提示: 请确保后端服务器正在运行（npm run start:dev）\n');

  try {
    const response = await fetch('http://localhost:3011/api/punch/attendance-punch/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo',
      },
      body: JSON.stringify({
        employeeNos: [employeeNo],
        punchDate: '2026-05-12',
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('  ✓ API调用成功\n');
    } else {
      console.log('  ⚠️  API调用失败:', result);
      console.log('\n  可能原因:');
      console.log('    1. 后端服务器未启动');
      console.log('    2. Token已过期');
      console.log('    3. 收卡逻辑有错误');
      return;
    }
  } catch (error: any) {
    console.log(`  ⚠️  API调用失败: ${error.message}`);
    console.log(`  请确保后端服务器正在运行`);
    return;
  }

  // 3. 查询收卡结果
  console.log('3. 查询收卡结果:');
  const attendancePairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: targetDate,
    },
    orderBy: { workStartPunchTime: 'asc' },
  });

  if (attendancePairs.length === 0) {
    console.log('  没有找到考勤摆卡记录');
    return;
  }

  console.log(`  找到 ${attendancePairs.length} 条记录\n`);

  attendancePairs.forEach((record, idx) => {
    const startTime = toLocalTime(record.workStartPunchTime);
    const endTime = toLocalTime(record.workEndPunchTime);
    const workHours = record.workStartPunchTime && record.workEndPunchTime
      ? ((record.workEndPunchTime.getTime() - record.workStartPunchTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
      : '0';

    console.log(`  记录${idx + 1} (ID: ${record.id}):`);
    console.log(`    时间: ${startTime} ~ ${endTime}`);
    console.log(`    工时: ${workHours}h`);

    // 显示使用的打卡卡
    if (record.workStartPunches) {
      try {
        const startPunches = JSON.parse(record.workStartPunches);
        if (startPunches.length > 0) {
          console.log(`    上班卡 (${startPunches.length}张):`);
          startPunches.forEach((p: any) => {
            const time = toLocalTime(new Date(p.punchTime));
            console.log(`      ${time} ${p.punchType} (ID: ${p.id})`);
          });
        } else {
          console.log(`    上班卡: 无（缺上班卡）`);
        }
      } catch (e) {
        console.log(`    上班卡: ${record.workStartPunches}`);
      }
    } else {
      console.log(`    上班卡: 无（缺上班卡）`);
    }

    if (record.workEndPunches) {
      try {
        const endPunches = JSON.parse(record.workEndPunches);
        if (endPunches.length > 0) {
          console.log(`    下班卡 (${endPunches.length}张):`);
          endPunches.forEach((p: any) => {
            const time = toLocalTime(new Date(p.punchTime));
            console.log(`      ${time} ${p.punchType} (ID: ${p.id})`);
          });
        } else {
          console.log(`    下班卡: 无（缺下班卡）`);
        }
      } catch (e) {
        console.log(`    下班卡: ${record.workEndPunches}`);
      }
    } else {
      console.log(`    下班卡: 无（缺下班卡）`);
    }

    console.log('');
  });

  // 4. 验证结果
  console.log('4. 验证结果:');

  // 检查是否有时间交叉
  let hasTimeCross = false;
  for (let i = 0; i < attendancePairs.length - 1; i++) {
    const currentEnd = attendancePairs[i].workEndPunchTime;
    const nextStart = attendancePairs[i + 1].workStartPunchTime;

    if (currentEnd && nextStart && nextStart < currentEnd) {
      hasTimeCross = true;
      console.log(`  ⚠️  发现时间交叉:`);
      console.log(`     记录${i + 1}下班: ${toLocalTime(currentEnd)}`);
      console.log(`     记录${i + 2}上班: ${toLocalTime(nextStart)}`);
    }
  }

  if (hasTimeCross) {
    console.log('\n  ❌ 仍有时间交叉问题');
  } else {
    console.log('\n  ✅ 没有时间交叉问题');
  }

  // 检查第二段是否缺上班卡
  if (attendancePairs.length >= 2) {
    const firstShiftEnd = attendancePairs[0].workEndPunchTime;
    const secondShiftStart = attendancePairs[1].workStartPunchTime;
    const secondShiftHasStart = attendancePairs[1].workStartPunches &&
                                 JSON.parse(attendancePairs[1].workStartPunches).length > 0;

    if (firstShiftEnd && !secondShiftStart && !secondShiftHasStart) {
      console.log('  ✅ 第二段正确地被标记为缺上班卡（避免了时间交叉）');
    } else if (firstShiftEnd && secondShiftStart && secondShiftStart < firstShiftEnd) {
      console.log('  ⚠️  第二段有上班卡，但时间早于第一段下班卡（应该缺上班卡）');
    }
  }

  console.log('');
  console.log('5. 修复说明:');
  console.log('  修改文件: attendance-punch.service.ts');
  console.log('  修改内容:');
  console.log('    1. collectSingleShiftPunch 增加 previousWorkEndTime 参数');
  console.log('    2. 收集上班卡后，检查是否早于前一个班次的下班卡');
  console.log('    3. 如果早于，认为缺上班卡，避免时间交叉');
  console.log('    4. 主循环中跟踪并传递 previousWorkEndTime');
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
