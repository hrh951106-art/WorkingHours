import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toLocalTime(date: Date | null): string {
  if (!date) return 'null';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

async function main() {
  console.log('=== 测试考勤工时重算 - 先删后增 ===\n');

  const employeeNo = '202604003';
  const testDate = '2026-05-14';

  // 1. 查询当前数据
  console.log('1. 查询当前考勤工时数据:');
  const attendanceHourCodes = await prisma.calculationAttendanceCode.findMany({
    where: { type: 'ATTENDANCE_HOURS' },
    select: { id: true },
  });

  const existingResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: new Date(testDate + 'T00:00:00.000Z'),
      calculationAttendanceCodeId: { in: attendanceHourCodes.map(c => c.id) },
    },
    orderBy: { punchInTime: 'asc' },
  });

  console.log(`  找到 ${existingResults.length} 条记录:\n`);
  existingResults.forEach((result, idx) => {
    const startTime = toLocalTime(result.punchInTime);
    const endTime = toLocalTime(result.punchOutTime);
    const workHours = result.actualHours?.toFixed(2);
    const amount = result.amount ? `¥${result.amount.toFixed(2)}` : '-';

    console.log(`  记录${idx + 1} (ID: ${result.id}):`);
    console.log(`    时间: ${startTime} ~ ${endTime}`);
    console.log(`    时长: ${workHours}h`);
    console.log(`    金额: ${amount}`);
    console.log(`    账户: ${result.accountName || '-'}`);
    console.log('');
  });

  // 2. 执行重算
  console.log('2. 执行考勤工时重算:');
  console.log('  提示: 请确保后端服务器正在运行\n');

  try {
    const response = await fetch('http://localhost:3011/api/calculate/attendance-work-hours/calculate-by-date-range', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo',
      },
      body: JSON.stringify({
        employeeNos: [employeeNo],
        startDate: testDate,
        endDate: testDate,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`  ✓ 计算成功: ${result.succeeded} 次`);
    } else {
      console.log(`  ⚠️  计算失败`);
      return;
    }
  } catch (error: any) {
    console.log(`  ⚠️  API调用失败: ${error.message}`);
    return;
  }

  // 3. 查询重算后的数据
  console.log('\n3. 查询重算后的数据:');
  const newResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: new Date(testDate + 'T00:00:00.000Z'),
      calculationAttendanceCodeId: { in: attendanceHourCodes.map(c => c.id) },
    },
    orderBy: { punchInTime: 'asc' },
  });

  console.log(`  找到 ${newResults.length} 条记录:\n`);
  newResults.forEach((result, idx) => {
    const startTime = toLocalTime(result.punchInTime);
    const endTime = toLocalTime(result.punchOutTime);
    const workHours = result.actualHours?.toFixed(2);
    const amount = result.amount ? `¥${result.amount.toFixed(2)}` : '-';

    console.log(`  记录${idx + 1} (ID: ${result.id}):`);
    console.log(`    时间: ${startTime} ~ ${endTime}`);
    console.log(`    时长: ${workHours}h`);
    console.log(`    金额: ${amount}`);
    console.log(`    账户: ${result.accountName || '-'}`);
    console.log('');
  });

  // 4. 对比验证
  console.log('4. 验证结果:');
  console.log(`  重算前记录数: ${existingResults.length}`);
  console.log(`  重算后记录数: ${newResults.length}`);

  // 检查是否有旧的记录ID还在（说明没有被删除）
  const oldIds = new Set(existingResults.map(r => r.id));
  const newIds = new Set(newResults.map(r => r.id));
  const intersection = [...oldIds].filter(id => newIds.has(id));

  if (intersection.length > 0) {
    console.log(`  ⚠️  发现 ${intersection.length} 条旧记录未被删除（ID: ${intersection.join(', ')}）`);
  } else {
    console.log(`  ✅ 所有旧记录已被正确删除`);
  }

  // 检查是否有重复数据
  if (newResults.length > 1) {
    console.log(`  ℹ️  重算后有 ${newResults.length} 条记录（可能是因为不同的劳动力账户）`);
  }

  console.log('\n5. 修复说明:');
  console.log('  修改位置: attendance-work-hour.service.ts');
  console.log('  修改内容:');
  console.log('    1. calculateDaily 方法开始时调用 deleteDailyWorkHourResults');
  console.log('    2. deleteDailyWorkHourResults 删除当天该员工的所有考勤工时数据');
  console.log('    3. saveWorkHourResults 移除检查逻辑，直接创建新记录');
  console.log('  优势:');
  console.log('    - 避免重算时数据重复');
  console.log('    - 简化保存逻辑，提高性能');
  console.log('    - 确保每次重算都是干净的新数据');
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
