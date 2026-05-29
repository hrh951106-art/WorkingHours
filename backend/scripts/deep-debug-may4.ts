import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605001';
  const startDate = '2026-05-01';
  const endDate = '2026-05-31';

  console.log('========================================');
  console.log(`深度排查：查询5月整月数据时5月4日记录未显示`);
  console.log('========================================\n');

  // 步骤1：查看数据库中5月4日的记录详情
  console.log('步骤1：查看数据库中5月4日的记录');
  console.log('========================================');

  const may4Record = await prisma.workHourResult.findFirst({
    where: {
      employeeNo,
      attendanceCode: 'A07',
    },
    orderBy: { workDate: 'asc' },
  });

  if (may4Record && may4Record.workDate.toISOString().substring(0, 10) === '2026-05-04') {
    console.log('找到5月4日记录:');
    console.log('  ID:', may4Record.id);
    console.log('  workDate (原始):', may4Record.workDate);
    console.log('  workDate (ISO):', may4Record.workDate.toISOString());
    console.log('  workDate (UTC):', may4Record.workDate.toUTCString());
    console.log('  workDate (本地):', may4Record.workDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
    console.log('  workHours:', may4Record.workHours);
    console.log('  definitionAttendanceCodeId:', may4Record.definitionAttendanceCodeId);
    console.log('  showInDetailPage:', may4Record.definitionAttendanceCode?.showInDetailPage);
  } else {
    console.log('未找到5月4日的记录');
  }

  // 步骤2：模拟查询5月整月数据（修复后的逻辑）
  console.log('\n步骤2：模拟查询5月整月数据');
  console.log('========================================');

  const start = new Date(startDate);
  const end = new Date(endDate);

  // 使用修复后的逻辑：setUTCHours
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  console.log('查询条件:');
  console.log('  startDate:', start.toISOString());
  console.log('  endDate:', end.toISOString());
  console.log('');

  const queryResults = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      workDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      definitionAttendanceCode: {
        select: {
          id: true,
          code: true,
          name: true,
          color: true,
          showInDetailPage: true,
        },
      },
    },
    orderBy: { workDate: 'asc' },
  });

  console.log(`查询结果: ${queryResults.length} 条记录`);
  queryResults.forEach((r) => {
    const date = r.workDate.toISOString().substring(0, 10);
    console.log(`  - ${date}: ${r.workHours}h, showInDetailPage: ${r.definitionAttendanceCode?.showInDetailPage}`);
  });

  // 步骤3：检查5月4日是否在查询结果中
  console.log('\n步骤3：检查5月4日记录');
  console.log('========================================');

  const may4Found = queryResults.find((r) => {
    const date = r.workDate.toISOString().substring(0, 10);
    return date === '2026-05-04';
  });

  if (may4Found) {
    console.log('✓ 5月4日记录在查询结果中');
  } else {
    console.log('✗ 5月4日记录不在查询结果中');

    // 检查5月4日记录的workDate是否在范围内
    if (may4Record) {
      const workDate = may4Record.workDate;
      const inRange = workDate >= start && workDate <= end;
      console.log('');
      console.log('5月4日记录的workDate:', workDate.toISOString());
      console.log('是否 >= startDate:', workDate >= start, `(${workDate.toISOString()} >= ${start.toISOString()})`);
      console.log('是否 <= endDate:', workDate <= end, `(${workDate.toISOString()} <= ${end.toISOString()})`);
      console.log('结果:', inRange ? '✓ 在范围内' : '✗ 不在范围内');
    }
  }

  // 步骤4：检查前端传递的参数格式
  console.log('\n步骤4：检查前端可能传递的参数格式');
  console.log('========================================');

  // 前端可能传递字符串格式
  const startFromString = new Date('2026-05-01');
  const endFromString = new Date('2026-05-31');

  console.log('前端传递 "2026-05-01" 和 "2026-05-31":');
  console.log('  startDate (ISO):', startFromString.toISOString());
  console.log('  endDate (ISO):', endFromString.toISOString());

  // 检查是否使用setHours（旧逻辑）
  const startOld = new Date('2026-05-01');
  const endOld = new Date('2026-05-31');
  startOld.setHours(0, 0, 0, 0);
  endOld.setHours(23, 59, 59, 999);

  console.log('');
  console.log('如果使用 setHours (旧逻辑):');
  console.log('  startDate:', startOld.toISOString());
  console.log('  endDate:', endOld.toISOString());

  // 检查是否使用setUTCHours（新逻辑）
  const startNew = new Date('2026-05-01');
  const endNew = new Date('2026-05-31');
  startNew.setUTCHours(0, 0, 0, 0);
  endNew.setUTCHours(23, 59, 59, 999);

  console.log('');
  console.log('如果使用 setUTCHours (新逻辑):');
  console.log('  startDate:', startNew.toISOString());
  console.log('  endDate:', endNew.toISOString());

  console.log('');
  console.log('5月4日记录 (2026-05-04T16:00:00.000Z):');
  console.log('  使用 setHours:', new Date('2026-05-04T16:00:00.000Z') <= endOld ? '✓ 匹配' : '✗ 不匹配');
  console.log('  使用 setUTCHours:', new Date('2026-05-04T16:00:00.000Z') <= endNew ? '✓ 匹配' : '✗ 不匹配');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});
