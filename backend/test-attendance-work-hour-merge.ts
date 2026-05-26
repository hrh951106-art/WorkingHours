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
  console.log('=== 测试考勤工时合并逻辑 ===\n');

  const employeeNo = '202604003';

  // 1. 删除已有的考勤工时数据
  console.log('1. 删除已有的考勤工时数据:');
  const attendanceHourCodes = await prisma.calculationAttendanceCode.findMany({
    where: { type: 'ATTENDANCE_HOURS' },
    select: { id: true },
  });

  if (attendanceHourCodes.length > 0) {
    const deleteResult = await prisma.calcResult.deleteMany({
      where: {
        calculationAttendanceCodeId: { in: attendanceHourCodes.map(c => c.id) },
      },
    });
    console.log(`  ✓ 删除了 ${deleteResult.count} 条旧数据`);
  }

  // 2. 执行考勤工时计算
  console.log('\n2. 执行考勤工时计算:');
  console.log('  提示: 请确保后端服务器正在运行（npm run start:dev）\n');

  const testDates = [
    '2026-05-11',
    '2026-05-12',
    '2026-05-14',
  ];

  for (const dateStr of testDates) {
    console.log(`  计算 ${dateStr}...`);
    try {
      const response = await fetch('http://localhost:3011/api/calculate/attendance-work-hours/calculate-by-date-range', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo',
        },
        body: JSON.stringify({
          employeeNos: [employeeNo],
          startDate: dateStr,
          endDate: dateStr,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`    ✓ ${dateStr} 计算成功: ${result.succeeded} 次成功, ${result.failed} 次失败`);
      } else {
        console.log(`    ⚠️  ${dateStr} 计算失败`);
      }
    } catch (error: any) {
      console.log(`    ⚠️  ${dateStr} API调用失败: ${error.message}`);
    }
  }

  // 3. 查询并显示结果
  console.log('\n3. 查询考勤工时结果:');
  const results = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calculationAttendanceCodeId: { in: attendanceHourCodes.map(c => c.id) },
      calcDate: {
        in: [
          new Date('2026-05-11T00:00:00.000Z'),
          new Date('2026-05-12T00:00:00.000Z'),
          new Date('2026-05-14T00:00:00.000Z'),
        ],
      },
    },
    include: {
      calculationAttendanceCode: {
        select: {
          code: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { calcDate: 'asc' },
  });

  console.log(`  找到 ${results.length} 条记录:\n`);

  // 按日期分组显示
  const groupedByDate = results.reduce((acc, result) => {
    const dateKey = result.calcDate.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(result);
    return acc;
  }, {} as Record<string, any[]>);

  for (const [date, dateResults] of Object.entries(groupedByDate)) {
    console.log(`  📅 ${date}:`);
    dateResults.forEach((result, idx) => {
      const startTime = toLocalTime(result.punchInTime);
      const endTime = toLocalTime(result.punchOutTime);
      const workHours = result.actualHours?.toFixed(2);
      const amount = result.amount ? `¥${result.amount.toFixed(2)}` : '-';

      console.log(`    记录${idx + 1}:`);
      console.log(`      时间: ${startTime} ~ ${endTime}`);
      console.log(`      时长: ${workHours}h`);
      console.log(`      金额: ${amount}`);
      console.log(`      账户: ${result.accountName || '-'}`);
      console.log('');
    });
  }

  // 4. 验证结果是否符合预期
  console.log('4. 验证结果:');
  const may11Results = groupedByDate['2026-05-11'] || [];
  const may12Results = groupedByDate['2026-05-12'] || [];
  const may14Results = groupedByDate['2026-05-14'] || [];

  console.log('  预期结果:');
  console.log('    5月11日: 1条记录，08:00~12:00，账户：大华富阳工厂/.../大桶/-/-/-');
  console.log('    5月12日: 2条记录');
  console.log('      - 07:00~08:00，账户：大华富阳工厂/.../大桶/-/-/-');
  console.log('      - 08:00~12:00，账户：大华富阳工厂/.../大桶/包装/-/-');
  console.log('    5月14日: 1条记录，08:00~18:30，账户：大华富阳工厂/.../大桶/-/-/-');

  console.log('\n  实际结果:');
  console.log(`    5月11日: ${may11Results.length}条记录`);
  console.log(`    5月12日: ${may12Results.length}条记录`);
  console.log(`    5月14日: ${may14Results.length}条记录`);

  // 验证是否符合预期
  let allPass = true;

  if (may11Results.length !== 1) {
    console.log('\n  ⚠️  5月11日应该有1条记录，实际有' + may11Results.length + '条');
    allPass = false;
  }

  if (may12Results.length !== 2) {
    console.log('\n  ⚠️  5月12日应该有2条记录，实际有' + may12Results.length + '条');
    allPass = false;
  }

  if (may14Results.length !== 1) {
    console.log('\n  ⚠️  5月14日应该有1条记录，实际有' + may14Results.length + '条');
    allPass = false;
  }

  if (allPass) {
    console.log('\n  ✅ 所有测试通过！合并逻辑正确');
  }
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
