import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 对比WorkHourResult表中计算推送的数据和工时申报的数据字段差异
 */

async function main() {
  console.log('=== 开始查询WorkHourResult字段对比 ===\n');

  // 1. 查询计算推送的数据示例 (sourceType in ('LEAN', 'ATTENDANCE'))
  console.log('1. 查询��算推送的数据（精益工时/考勤工时）...\n');
  const calculatedResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: {
        in: ['LEAN', 'ATTENDANCE'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 3,
  });

  console.log(`找到 ${calculatedResults.length} 条计算推送的数据`);
  if (calculatedResults.length > 0) {
    console.log('\n示例数据（计算推送）:');
    console.log(JSON.stringify(calculatedResults[0], null, 2));
  }

  // 2. 查询工时申报的数据示例 (sourceType = 'LABOR_HOUR_REPORT')
  console.log('\n\n2. 查询工时申报的数据...\n');
  const reportedResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: 'LABOR_HOUR_REPORT',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 3,
  });

  console.log(`找到 ${reportedResults.length} 条工时申报的数据`);
  if (reportedResults.length > 0) {
    console.log('\n示例数据（工时申报）:');
    console.log(JSON.stringify(reportedResults[0], null, 2));
  }

  // 3. 统计字段对比
  console.log('\n\n3. 字段存在性对比...\n');

  // 所有可能的字段
  const allFields = [
    'id',
    'employeeNo',
    'employeeId',
    'workDate',
    'calcDate',
    'shiftId',
    'shiftName',
    'attendanceCodeId',
    'attendanceCode',
    'calcAttendanceCode',
    'attendanceCodeName',
    'workHours',
    'amount',
    'calculateAmount',
    'accountId',
    'accountName',
    'accountPath',
    'sourceType',
    'sourceId',
    'source',
    'sourceBatchId',
    'attendancePunchPair',
    'customFields',
    'orgId',
    'definitionAttendanceCodeId',
    'definitionAttendanceCodeStr',
    'startTime',
    'endTime',
    'status',
    'createdAt',
    'updatedAt',
  ];

  // 检查计算推送数据中的字段
  const calculatedFields = new Set<string>();
  if (calculatedResults.length > 0) {
    Object.keys(calculatedResults[0]).forEach(key => calculatedFields.add(key));
  }

  // 检查工时申报数据中的字段
  const reportedFields = new Set<string>();
  if (reportedResults.length > 0) {
    Object.keys(reportedResults[0]).forEach(key => reportedFields.add(key));
  }

  console.log('字段对比结果：');
  console.log('┌─────────────────────────────┬──────────────────┬──────────────────┬──────────────────┐');
  console.log('│ 字段名                      │ 计算推送有值      │ 工时申报有值      │ 说明             │');
  console.log('├─────────────────────────────┼──────────────────┼──────────────────┼──────────────────┤');

  allFields.forEach(field => {
    const hasCalculated = calculatedResults.length > 0 && calculatedResults[0][field as keyof any] !== null && calculatedResults[0][field as keyof any] !== undefined;
    const hasReported = reportedResults.length > 0 && reportedResults[0][field as keyof any] !== null && reportedResults[0][field as keyof any] !== undefined;

    const calculatedStatus = hasCalculated ? '✓ 有值' : '✗ 无值';
    const reportedStatus = hasReported ? '✓ 有值' : '✗ 无值';

    let description = '';
    if (hasCalculated && !hasReported) {
      description = '仅计算推送有';
    } else if (!hasCalculated && hasReported) {
      description = '仅工时申报有';
    } else if (hasCalculated && hasReported) {
      description = '两者都有';
    } else {
      description = '两者都无';
    }

    console.log(`│ ${field.padEnd(27)} │ ${calculatedStatus.padEnd(16)} │ ${reportedStatus.padEnd(16)} │ ${description.padEnd(16)} │`);
  });

  console.log('└─────────────────────────────┴──────────────────┴──────────────────┴──────────────────┘');

  // 4. 详细字段差异分析
  console.log('\n\n4. 详细字段差异分析...\n');

  if (calculatedResults.length > 0 && reportedResults.length > 0) {
    const calc = calculatedResults[0];
    const rep = reportedResults[0];

    console.log('关键字段值对比：');
    console.log('┌─────────────────────────────┬───────────────────────────────┬───────────────────────────────┬──────────────┐');
    console.log('│ 字段名                      │ 计算推送示例值                │ 工时申报示例值                │ 是否相同      │');
    console.log('├─────────────────────────────┼───────────────────────────────┼───────────────────────────────┼──────────────┤');

    const compareFields = [
      'employeeId',
      'shiftId',
      'shiftName',
      'attendanceCodeId',
      'calcAttendanceCode',
      'amount',
      'calculateAmount',
      'source',
      'sourceBatchId',
      'attendancePunchPair',
      'orgId',
      'definitionAttendanceCodeStr',
    ];

    compareFields.forEach(field => {
      const calcValue = JSON.stringify(calc[field as keyof any]);
      const repValue = JSON.stringify(rep[field as keyof any]);
      const isSame = calcValue === repValue;
      const sameStatus = isSame ? '✓ 相同' : '✗ 不同';

      const calcDisplay = calcValue.length > 30 ? calcValue.substring(0, 27) + '...' : calcValue;
      const repDisplay = repValue.length > 30 ? repValue.substring(0, 27) + '...' : repValue;

      console.log(`│ ${field.padEnd(27)} │ ${calcDisplay.padEnd(29)} │ ${repDisplay.padEnd(29)} │ ${sameStatus.padEnd(12)} │`);
    });

    console.log('└─────────────────────────────┴───────────────────────────────┴───────────────────────────────┴──────────────┘');
  }

  // 5. 统计信息
  console.log('\n\n5. 统计信息...\n');
  const calculatedCount = await prisma.workHourResult.count({
    where: { sourceType: { in: ['LEAN', 'ATTENDANCE'] } },
  });
  const reportedCount = await prisma.workHourResult.count({
    where: { sourceType: 'LABOR_HOUR_REPORT' },
  });

  console.log(`计算推送数据总数: ${calculatedCount}`);
  console.log(`工时申报数据总数: ${reportedCount}`);
}

main()
  .then(() => {
    console.log('\n查询完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
