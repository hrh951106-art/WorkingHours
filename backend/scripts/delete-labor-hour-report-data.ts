import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 删除所有工时报工相关数据
 * 包括：
 * 1. WorkHourResult 表中 sourceType='LABOR_HOUR_REPORT' 的数据
 * 2. LaborHourReportEmployee 关联表数据
 * 3. LaborHourReportRequest 主表数据
 */

async function main() {
  console.log('=== 删除工时报工数据 ===\n');

  try {
    // 1. 查询所有工时报表申请
    console.log('1. 查询工时报表申请:\n');
    const requests = await prisma.laborHourReportRequest.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`找到 ${requests.length} 条工时报表申请\n`);

    if (requests.length === 0) {
      console.log('没有工时报表数据需要删除');
      return;
    }

    requests.forEach(req => {
      console.log(`  ID: ${req.id}, 单号: ${req.requestNo}, 状态: ${req.status}, 团队成员: ${req._count.employees}人`);
    });

    // 2. 查询对应的 WorkHourResult 数据
    console.log('\n2. 查询对应的工时结果数据:\n');
    const workHourResults = await prisma.workHourResult.findMany({
      where: { sourceType: 'LABOR_HOUR_REPORT' },
    });

    console.log(`找到 ${workHourResults.length} 条工时结果数据`);
    workHourResults.forEach(result => {
      console.log(`  ID: ${result.id}, 员工: ${result.employeeNo || 'null'}, 来源ID: ${result.sourceId}`);
    });

    // 3. 确认删除
    console.log('\n3. 准备删除以下数据:');
    console.log(`  - LaborHourReportRequest: ${requests.length} 条`);
    console.log(`  - LaborHourReportEmployee: ${requests.reduce((sum, req) => sum + req._count.employees, 0)} 条`);
    console.log(`  - WorkHourResult: ${workHourResults.length} 条`);

    // 4. 执行删除（使用事务）
    console.log('\n4. 开始删除...\n');

    await prisma.$transaction(async (tx) => {
      // 删除 WorkHourResult 数据
      const deletedWorkHourResults = await tx.workHourResult.deleteMany({
        where: { sourceType: 'LABOR_HOUR_REPORT' },
      });
      console.log(`✓ 删除 WorkHourResult: ${deletedWorkHourResults.count} 条`);

      // 删除 LaborHourReportEmployee 关联数据
      const deletedEmployees = await tx.laborHourReportEmployee.deleteMany({
        where: {
          requestId: {
            in: requests.map(r => r.id),
          },
        },
      });
      console.log(`✓ 删除 LaborHourReportEmployee: ${deletedEmployees.count} 条`);

      // 删除 LaborHourReportRequest 主数据
      const deletedRequests = await tx.laborHourReportRequest.deleteMany({
        where: {
          id: {
            in: requests.map(r => r.id),
          },
        },
      });
      console.log(`✓ 删除 LaborHourReportRequest: ${deletedRequests.count} 条`);
    });

    console.log('\n✅ 删除成功！');

  } catch (error) {
    console.error('\n❌ 删除失败:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n=== 完成 ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
