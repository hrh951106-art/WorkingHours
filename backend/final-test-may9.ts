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
  console.log('=== 完整测试：5月9日考勤摆卡收卡 ===\n');

  const employeeNo = '202604003';

  // 1. 显示班次信息
  console.log('1. 班次配置:');
  console.log('  段1: 08:00 ~ 12:00 (NORMAL - 工作)');
  console.log('  段2: 12:00 ~ 13:30 (REST - 休息)');
  console.log('  段3: 13:30 ~ 17:30 (NORMAL - 工作)');
  console.log('');
  console.log('  连续性检查:');
  console.log('    段1结束 12:00 = 段2开始 12:00 → 间隔 0分钟 ✓');
  console.log('    段2结束 13:30 = 段3开始 13:30 → 间隔 0分钟 ✓');
  console.log('  结论: ✓ 所有段连续，当1个班处理');

  // 2. 打卡记录
  const targetDate = new Date('2026-05-09T00:00:00.000Z');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      employeeNo,
      punchTime: {
        gte: targetDate,
        lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log('\n2. 实际打卡记录:');
  punchRecords.forEach((punch) => {
    const time = toLocalTime(punch.punchTime);
    console.log(`  ${time} ${punch.punchType} (ID: ${punch.id})`);
  });

  console.log('\n  预期收卡:');
  console.log(`    上班卡: 08:00 附近 → 08:00 IN (ID: 20)`);
  console.log(`    下班卡: 17:30 附近 → 18:00 OUT (ID: 24)`);
  console.log(`    结果: 08:00 ~ 18:00 (10小时)`);

  // 3. 调用API收卡
  console.log('\n3. 调用API执行收卡:');
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
        punchDate: '2026-05-09',
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('  ✓ API调用成功');
    } else {
      console.log('  ⚠️  API调用失败:', result);
      console.log('\n  可能原因:');
      console.log('    1. 后端服务器未启动');
      console.log('    2. Token已过期');
      console.log('    3. 收卡逻辑有错误');
      console.log('\n  解决方法:');
      console.log('    - 启动后端: cd backend && npm run start:dev');
      console.log('    - 或手动在前端触发收卡操作');
    }
  } catch (error: any) {
    console.log(`  ⚠️  API调用失败: ${error.message}`);
    console.log(`  请确保后端服务器正在运行`);
    console.log(`  或手动在前端界面触发收卡操作`);
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
    console.log('  没有找到考勤摆卡记录');
    console.log('  请检查API调用是否成功，或手动执行收卡');
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
    console.log(`    连续班次: ${record.isContinuousShift ? '是' : '否'}`);

    // 显示使用的打卡卡
    if (record.workStartPunches) {
      try {
        const startPunches = JSON.parse(record.workStartPunches);
        startPunches.forEach((p: any) => {
          const time = toLocalTime(new Date(p.punchTime));
          console.log(`    上班卡: ${time} (ID: ${p.id})`);
        });
      } catch (e) {}
    }

    if (record.workEndPunches) {
      try {
        const endPunches = JSON.parse(record.workEndPunches);
        endPunches.forEach((p: any) => {
          const time = toLocalTime(new Date(p.punchTime));
          console.log(`    下班卡: ${time} (ID: ${p.id})`);
        });
      } catch (e) {}
    }

    console.log('');
  });

  // 5. 验证结果
  console.log('5. 验证结果:');

  const isCorrect = attendancePairs.length === 1 &&
                   attendancePairs[0].workStartPunchTime &&
                   toLocalTime(attendancePairs[0].workStartPunchTime).includes('08:00') &&
                   attendancePairs[0].workEndPunchTime &&
                   toLocalTime(attendancePairs[0].workEndPunchTime).includes('18:00');

  console.log(`  预期: 1条记录，08:00 ~ 18:00`);
  console.log(`  实际: ${attendancePairs.length}条记录`);

  if (attendancePairs.length > 0) {
    const startTime = toLocalTime(attendancePairs[0].workStartPunchTime);
    const endTime = toLocalTime(attendancePairs[0].workEndPunchTime);
    console.log(`  时间: ${startTime} ~ ${endTime}`);
  }

  if (isCorrect) {
    console.log('\n  ✅ 测试通过！收卡结果符合预期');
  } else if (attendancePairs.length === 0) {
    console.log('\n  ⚠️  未找到收卡记录，请确认API调用成功');
  } else {
    console.log('\n  ❌ 测试失败，结果与预期不符');
  }

  // 6. 对比修复前后
  console.log('\n6. 修复前后对比:');
  console.log('  修复前:');
  console.log('    - 只检查NORMAL段的连续性');
  console.log('    - 段1(08:00~12:00)和段3(13:30~17:30)间隔90分钟 > 10分钟阈值');
  console.log('    - 判定为不连续，拆分为2个虚拟班次');
  console.log('    - 收2对卡，时间交叉60分钟');
  console.log('');
  console.log('  修复后:');
  console.log('    - 检查所有段（包括REST）的连续性');
  console.log('    - 段1、段2、段3都是连续的（间隔0分钟）');
  console.log('    - 判定为连续，当1个班处理');
  console.log('    - 只收1对卡：08:00 ~ 18:00，无时间交叉');
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
