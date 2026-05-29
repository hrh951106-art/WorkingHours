import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const requestNo = 'LABOR202605272044479774';

  console.log(`查询工时报工表单: ${requestNo}\n`);

  // 1. 查询工时报工申请
  const report = await prisma.laborHourReportRequest.findUnique({
    where: { requestNo },
    include: {
      employees: true
    }
  });

  if (!report) {
    console.log('❌ 未找到该工��报工申请记录');
    return;
  }

  console.log('=== 工时报工申请信息 ===');
  console.log(`申请单号: ${report.requestNo}`);
  console.log(`标题: ${report.title}`);
  console.log(`状态: ${report.status}`);
  console.log(`报工日期: ${new Date(report.reportDate).toISOString().substring(0, 10)}`);
  console.log(`报工模式: ${report.reportMode === 'personal' ? '个人报工' : '团队报工'}`);
  console.log(`员工编号: ${report.employeeNo || 'N/A'}`);
  console.log(`员工姓名: ${report.employeeName || 'N/A'}`);
  console.log(`工时类型: ${report.hourTypeName} (${report.hourType})`);
  console.log(`工时数值: ${report.value} ${report.unit}`);
  console.log(`时间段: ${report.startTime} - ${report.endTime}`);
  console.log(`账户: ${report.accountName} (${report.accountCode})`);
  console.log(`发起时间: ${report.createdAt.toISOString().substring(0, 19).replace('T', ' ')}`);
  console.log(`流程实例ID: ${report.instanceId || 'N/A'}`);
  console.log(`审批状态: ${report.approverName ? `已通过 (${report.approverName})` : '未审批'}`);
  console.log(`审批时间: ${report.approvedAt ? report.approvedAt.toISOString().substring(0, 19).replace('T', ' ') : 'N/A'}`);

  // 2. 查询流程实例状态
  if (report.instanceId) {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: report.instanceId },
      select: {
        id: true,
        status: true,
        currentStep: true,
        finishedAt: true
      }
    });

    if (instance) {
      console.log(`\n=== 流程实例信息 ===`);
      console.log(`实例ID: ${instance.id}`);
      console.log(`流程状态: ${instance.status}`);
      console.log(`当前节点: ${instance.currentStep || 'N/A'}`);
      console.log(`完成时间: ${instance.finishedAt ? instance.finishedAt.toISOString().substring(0, 19).replace('T', ' ') : 'N/A'}`);
    }
  }

  // 3. 查询关联的工时结果记录
  console.log(`\n=== 工时结果记录 ===`);
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: 'LABOR_HOUR_REPORT',
      sourceId: report.id
    }
  });

  if (workHourResults.length === 0) {
    console.log('❌ 未找到对应的工时结果记录');
    console.log('\n结论: 该工时报工表单尚未推送到工时结果表');

    // 分析原因
    console.log('\n可能原因:');
    if (report.status !== 'APPROVED') {
      console.log('  - 申请状态未审批通过');
    }
    if (report.instanceId) {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: report.instanceId }
      });
      if (instance && instance.status !== 'COMPLETED') {
        console.log('  - 流程实例未完成');
      }
    } else {
      console.log('  - 未创建流程实例');
    }
  } else {
    console.log(`✅ 找到 ${workHourResults.length} 条工时结果记录\n`);

    workHourResults.forEach((result, index) => {
      const workDate = result.workDate.toISOString().substring(0, 10);
      const startTime = result.startTime ? result.startTime.toISOString().substring(11, 19) : 'N/A';
      const endTime = result.endTime ? result.endTime.toISOString().substring(11, 19) : 'N/A';

      console.log(`${index + 1}. 记录ID: ${result.id}`);
      console.log(`   员工编号: ${result.employeeNo || 'N/A'}`);
      console.log(`   工作日期: ${workDate}`);
      console.log(`   时间段: ${startTime} - ${endTime}`);
      console.log(`   工时: ${result.workHours} 小时`);
      console.log(`   出勤代码: ${result.attendanceCode || 'N/A'} (${result.attendanceCodeName || 'N/A'})`);
      console.log(`   账户: ${result.accountName || 'N/A'}`);
      console.log(`   状态: ${result.status}`);
      console.log(`   创建时间: ${result.createdAt.toISOString().substring(0, 19).replace('T', ' ')}`);
      console.log('');
    });

    console.log('结论: 该工时报工表单已推送到工时结果表');
  }

  // 4. 查询报工员工列表（团队报工）
  if (report.reportMode === 'team' && report.employees.length > 0) {
    console.log(`\n=== 报工员工列表 (${report.employees.length}人) ===`);
    report.employees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.employeeName} (${emp.employeeNo})`);
    });
  }
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
