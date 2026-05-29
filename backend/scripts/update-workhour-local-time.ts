import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('更新工时结果记录，添加本地时间字段...\n');

  // 查询所有 LABOR_HOUR_REPORT 类型的工时结果
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: 'LABOR_HOUR_REPORT'
    }
  });

  console.log(`找到 ${workHourResults.length} 条工时报工产生的工时结果记录\n`);

  if (workHourResults.length === 0) {
    console.log('没有需要更新的记录');
    await prisma.$disconnect();
    return;
  }

  // 获取对应的工时报工申请，获取原始时间字符串
  const sourceIds = workHourResults.map(r => r.sourceId).filter(id => id !== null);

  const laborReports = await prisma.laborHourReportRequest.findMany({
    where: {
      id: { in: sourceIds as number[] }
    },
    select: {
      id: true,
      reportDate: true,
      startTime: true,
      endTime: true
    }
  });

  // 创建 sourceId -> report 的映射
  const reportMap = new Map();
  for (const report of laborReports) {
    reportMap.set(report.id, report);
  }

  let updatedCount = 0;

  for (const result of workHourResults) {
    // 解析现有的 customFields
    let customFields: any = {};
    try {
      customFields = result.customFields ? JSON.parse(result.customFields) : {};
    } catch (e) {
      customFields = {};
    }

    // 如果已经有本地时间字段，跳过
    if (customFields.localStartTime && customFields.localEndTime) {
      console.log(`记录 ${result.id}: 已有本地时间字段，跳过`);
      continue;
    }

    // 从对应的工时报工申请中获取原始时间
    const report = reportMap.get(result.sourceId);
    if (!report) {
      console.log(`记录 ${result.id}: 未找到对应的工时报工申请，跳过`);
      continue;
    }

    // 构建本地时间字符串（直接使用原始的 startTime 和 endTime）
    const workDateStr = new Date(report.reportDate).toISOString().substring(0, 10);
    const localStartTimeStr = `${workDateStr} ${report.startTime}`;
    const localEndTimeStr = `${workDateStr} ${report.endTime}`;

    // 更新 customFields
    customFields.localStartTime = localStartTimeStr;
    customFields.localEndTime = localEndTimeStr;

    // 更新数据库记录
    await prisma.workHourResult.update({
      where: { id: result.id },
      data: {
        customFields: JSON.stringify(customFields)
      }
    });

    updatedCount++;

    console.log(`✓ 记录 ${result.id}: 已更新本地时间字段`);
    console.log(`  原始开始时间: ${report.startTime} → ${localStartTimeStr}`);
    console.log(`  原始结束时间: ${report.endTime} → ${localEndTimeStr}`);
  }

  console.log(`\n✅ 更新完成！共更新 ${updatedCount} 条记录\n`);

  // 验证更新结果
  console.log('验证更新结果：');
  const updatedResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: 'LABOR_HOUR_REPORT'
    },
    take: 5
  });

  for (const result of updatedResults) {
    const customFields = JSON.parse(result.customFields || '{}');
    console.log(`\n记录 ID: ${result.id}`);
    console.log(`  工作日期: ${result.workDate.toISOString().substring(0, 10)}`);
    console.log(`  UTC开始时间: ${result.startTime?.toISOString().substring(11, 19)}`);
    console.log(`  UTC结束时间: ${result.endTime?.toISOString().substring(11, 19)}`);
    console.log(`  本地开始时间: ${customFields.localStartTime || 'N/A'}`);
    console.log(`  本地结束时间: ${customFields.localEndTime || 'N/A'}`);
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('更新失败:', e);
    process.exit(1);
  });
