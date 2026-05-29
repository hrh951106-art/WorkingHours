import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始删除所有工时报工表单及流程实例...\n');

  try {
    // 1. 查询所有工时报工申请
    const allReports = await prisma.laborHourReportRequest.findMany({
      select: {
        id: true,
        requestNo: true,
        title: true,
        instanceId: true,
        status: true,
      },
    });

    console.log(`找到 ${allReports.length} 条工时报工申请记录`);

    if (allReports.length === 0) {
      console.log('没有工时报工记录需要删除');
      return;
    }

    // 显示前20条记录
    const displayCount = Math.min(allReports.length, 20);
    console.log(`\n显示前 ${displayCount} 条记录:`);
    for (let i = 0; i < displayCount; i++) {
      const report = allReports[i];
      console.log(`  ${i + 1}. ${report.requestNo} - ${report.title} (ID: ${report.id}, 状态: ${report.status}, 实例ID: ${report.instanceId})`);
    }

    if (allReports.length > 20) {
      console.log(`  ... 还有 ${allReports.length - 20} 条记录未显示`);
    }

    // 2. 统计将要删除的数据
    const reportIds = allReports.map(r => r.id);
    const instanceIds = allReports.map(r => r.instanceId).filter(id => id !== null);

    const employeeCount = await prisma.laborHourReportEmployee.count({
      where: {
        requestId: { in: reportIds }
      }
    });

    const approvalCount = await prisma.workflowApproval.count({
      where: {
        instanceId: { in: instanceIds as number[] }
      }
    });

    console.log(`\n将要删除的数据:`);
    console.log(`  - 工时报工申请: ${allReports.length} 条`);
    console.log(`  - 报工员工记录: ${employeeCount} 条`);
    console.log(`  - 流程实例: ${instanceIds.length} 个`);
    console.log(`  - 审批记录: ${approvalCount} 条`);

    // 3. 执行删除（按照外键依赖顺序）
    console.log(`\n开始删除...`);

    let deletedEmployees = 0;
    let deletedApprovals = 0;
    let deletedInstances = 0;
    let deletedReports = 0;

    await prisma.$transaction(async (tx) => {
      // 3.1 删除工时报工员工记录
      deletedEmployees = (await tx.laborHourReportEmployee.deleteMany({
        where: {
          requestId: { in: reportIds }
        }
      })).count;

      console.log(`  ✓ 删除 ${deletedEmployees} 条员工记录`);

      // 3.2 删除流程审批记录
      deletedApprovals = (await tx.workflowApproval.deleteMany({
        where: {
          instanceId: { in: instanceIds as number[] }
        }
      })).count;

      console.log(`  ✓ 删除 ${deletedApprovals} 条审批记录`);

      // 3.3 删除流程实例
      deletedInstances = (await tx.workflowInstance.deleteMany({
        where: {
          id: { in: instanceIds as number[] }
        }
      })).count;

      console.log(`  ✓ 删除 ${deletedInstances} 个流程实例`);

      // 3.4 删除工时报工申请记录
      deletedReports = (await tx.laborHourReportRequest.deleteMany({
        where: {
          id: { in: reportIds }
        }
      })).count;

      console.log(`  ✓ 删除 ${deletedReports} 条工时报工申请`);
    });

    // 4. 删除关联的工时结果数据（通过 sourceType 标记）
    const deletedWorkHourResults = await prisma.workHourResult.deleteMany({
      where: {
        sourceType: 'LABOR_HOUR_REPORT'
      }
    });

    if (deletedWorkHourResults.count > 0) {
      console.log(`  ✓ 删除 ${deletedWorkHourResults.count} 条工时结果记录`);
    }

    console.log(`\n✅ 删除完成！`);
    console.log(`\n删除统计:`);
    console.log(`  - 工时报工申请: ${deletedReports} 条`);
    console.log(`  - 报工员工记录: ${deletedEmployees} 条`);
    console.log(`  - 流程实例: ${deletedInstances} 个`);
    console.log(`  - 审批记录: ${deletedApprovals} 条`);
    console.log(`  - 工时结果记录: ${deletedWorkHourResults.count} 条`);
    console.log(`  总计: ${deletedReports + deletedEmployees + deletedInstances + deletedApprovals + deletedWorkHourResults.count} 条记录`);

  } catch (error) {
    console.error('删除失败:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('脚本执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
