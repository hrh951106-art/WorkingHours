import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('验证工时报工数据删除情况...\n');

  // 检查剩余数据
  const remainingReports = await prisma.laborHourReportRequest.count();
  const remainingInstances = await prisma.workflowInstance.count({
    where: {
      category: 'LABOR_HOUR_REPORT'
    }
  });
  const remainingEmployees = await prisma.laborHourReportEmployee.count();
  const remainingWorkHourResults = await prisma.workHourResult.count({
    where: {
      sourceType: 'LABOR_HOUR_REPORT'
    }
  });

  console.log('剩余数据统计:');
  console.log(`  - 工时报工申请: ${remainingReports} 条`);
  console.log(`  - 工时报工流程实例: ${remainingInstances} 个`);
  console.log(`  - 报工员工记录: ${remainingEmployees} 条`);
  console.log(`  - 工时报工产生的工时结果: ${remainingWorkHourResults} 条`);

  if (remainingReports === 0 && remainingInstances === 0 && remainingEmployees === 0 && remainingWorkHourResults === 0) {
    console.log('\n✅ 所有工时报工相关数据已完全删除！');
  } else {
    console.log('\n⚠️ 仍有部分数据未删除');
  }
}

main()
  .catch((e) => {
    console.error('验证失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
