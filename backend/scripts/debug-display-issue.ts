import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605001';
  const startDate = '2026-05-01';
  const endDate = '2026-05-06';

  console.log('========================================');
  console.log(`排查员工 ${employeeNo} 在 ${startDate} 到 ${endDate} 的挣得工时显示问题`);
  console.log('========================================\n');

  // 步骤1: 确认数据库中是否有这个日期范围的数据
  console.log('步骤1: 检查数据库中的数据');
  console.log('========================================');

  const allRecords = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      attendanceCode: 'A07',
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

  console.log(`该员工所有挣得工时记录: ${allRecords.length} 条\n`);

  // 筛选5月1日到5月6日的记录
  const targetRecords = allRecords.filter((r) => {
    const date = r.workDate.toISOString().substring(0, 10);
    return date >= startDate && date <= endDate;
  });

  console.log(`5月1日到5月6日的记录: ${targetRecords.length} 条`);
  targetRecords.forEach((r) => {
    const date = r.workDate.toISOString().substring(0, 10);
    console.log(`  - ${date}: ${r.workHours}h, definitionAttendanceCodeId: ${r.definitionAttendanceCodeId}, showInDetailPage: ${r.definitionAttendanceCode?.showInDetailPage}`);
  });

  // 步骤2: 检查前端的查询条件
  console.log('\n步骤2: 检查前端API查询条件');
  console.log('========================================');

  // 前端查询使用的是calcDate字段，不是workDate！
  console.log('前端查询使用calcDate字段');
  console.log(`查询范围: ${startDate} 到 ${endDate}`);

  // 检查calcDate是否在查询范围内
  const calcDateInRange = targetRecords.filter((r) => {
    const calcDate = r.calcDate.toISOString().substring(0, 10);
    return calcDate >= startDate && calcDate <= endDate;
  });

  console.log(`calcDate在范围内的记录: ${calcDateInRange.length} 条`);
  calcDateInRange.forEach((r) => {
    const workDate = r.workDate.toISOString().substring(0, 10);
    const calcDate = r.calcDate.toISOString().substring(0, 10);
    console.log(`  - workDate: ${workDate}, calcDate: ${calcDate}, ${r.workHours}h`);
  });

  // 步骤3: 模拟前端API调用
  console.log('\n步骤3: 模拟前端API调用');
  console.log('========================================');

  const apiRecords = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      workDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
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
    orderBy: { workDate: 'desc' },
  });

  console.log(`API返回记录数: ${apiRecords.length}`);
  apiRecords.forEach((r) => {
    const workDate = r.workDate.toISOString().substring(0, 10);
    console.log(`  - ${workDate}: ${r.workHours}h, showInDetailPage: ${r.definitionAttendanceCode?.showInDetailPage}`);
  });

  // 步骤4: 检查前端过滤逻辑
  console.log('\n步骤4: 检查前端过滤逻辑');
  console.log('========================================');

  let filteredCount = 0;
  let hiddenCount = 0;

  apiRecords.forEach((r) => {
    const showInDetailPage = r.definitionAttendanceCode?.showInDetailPage;
    if (showInDetailPage === false) {
      hiddenCount++;
      console.log(`✗ 被过滤: ${r.workDate.toISOString().substring(0, 10)}, ${r.workHours}h (showInDetailPage=false)`);
    } else if (showInDetailPage === undefined || showInDetailPage === null) {
      hiddenCount++;
      console.log(`✗ 被过滤: ${r.workDate.toISOString().substring(0, 10)}, ${r.workHours}h (showInDetailPage=undefined/null)`);
    } else {
      filteredCount++;
      console.log(`✓ 应该显示: ${r.workDate.toISOString().substring(0, 10)}, ${r.workHours}h`);
    }
  });

  console.log(`\n应该显示的记录: ${filteredCount} 条`);
  console.log(`被过滤的记录: ${hiddenCount} 条`);

  // 步骤5: 检查workDate字段的时区问题
  console.log('\n步骤5: 检查workDate字段的时区');
  console.log('========================================');

  apiRecords.forEach((r) => {
    const workDate = r.workDate;
    const isoString = workDate.toISOString();
    const localString = workDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const dateOnly = workDate.toISOString().substring(0, 10);

    console.log(`记录ID: ${r.id}`);
    console.log(`  ISO字符串: ${isoString}`);
    console.log(`  本地时间: ${localString}`);
    console.log(`  日期部分: ${dateOnly}`);
    console.log(`  是否在范围 (${startDate} - ${endDate}): ${dateOnly >= startDate && dateOnly <= endDate ? '✓ 是' : '✗ 否'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('错误:', e);
  process.exit(1);
});
