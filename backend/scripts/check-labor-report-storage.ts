import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const requestNo = 'LABOR202605272117073311';

  console.log(`查询工时报工表单: ${requestNo}\n`);

  // 1. 查询工时报工申请
  const report = await prisma.laborHourReportRequest.findUnique({
    where: { requestNo },
  });

  if (!report) {
    console.log('❌ 未找到该工时报工申请记录');
    await prisma.$disconnect();
    return;
  }

  console.log('=== 工时报工申请基本信息 ===');
  console.log(`ID: ${report.id}`);
  console.log(`申请单号: ${report.requestNo}`);
  console.log(`工作流代码: ${report.workflowCode}`);
  console.log(`标题: ${report.title}`);
  console.log(`状态: ${report.status}`);
  console.log(`报工日期: ${report.reportDate}`);
  console.log(`报工模式: ${report.reportMode}`);
  console.log(`员工ID: ${report.employeeId || 'N/A'}`);
  console.log(`员工编号: ${report.employeeNo || 'N/A'}`);
  console.log(`员工姓名: ${report.employeeName || 'N/A'}`);
  console.log(`工时类型: ${report.hourTypeName} (${report.hourType})`);
  console.log(`工时数值: ${report.value} ${report.unit}`);
  console.log(`时间段: ${report.startTime} - ${report.endTime}`);
  console.log(`账户: ${report.accountName} (${report.accountCode})`);
  console.log(`发起人: ${report.requesterName} (ID: ${report.requesterId})`);
  console.log(`发起时间: ${report.createdAt.toISOString().substring(0, 19).replace('T', ' ')}`);
  console.log(`流程实例ID: ${report.instanceId || 'N/A'}`);
  console.log(`审批人: ${report.approverName || 'N/A'}`);
  console.log(`审批时间: ${report.approvedAt ? report.approvedAt.toISOString().substring(0, 19).replace('T', ' ') : 'N/A'}`);
  console.log('');

  // 2. 查询报工员工列表（团队报工）
  if (report.reportMode === 'team') {
    const employees = await prisma.laborHourReportEmployee.findMany({
      where: { requestId: report.id },
    });

    if (employees.length > 0) {
      console.log('=== 报工员工列表 ===');
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. 员工ID: ${emp.employeeId}, 编号: ${emp.employeeNo}, 姓名: ${emp.employeeName}`);
      });
      console.log('');
    }
  }

  // 3. 查询流程实例信息
  if (report.instanceId) {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: report.instanceId },
      include: {
        approvals: true,
        definition: true,
      },
    });

    if (instance) {
      console.log('=== 流程实例信息 ===');
      console.log(`实例ID: ${instance.id}`);
      console.log(`实例编号: ${instance.instanceNo}`);
      console.log(`流程状态: ${instance.status}`);
      console.log(`当前节点: ${instance.currentStep || 'N/A'}`);
      console.log(`发起人: ${instance.initiatorName} (ID: ${instance.initiatorId})`);
      console.log(`发起时间: ${instance.initiatedAt.toISOString().substring(0, 19).replace('T', ' ')}`);
      console.log(`完成时间: ${instance.finishedAt ? instance.finishedAt.toISOString().substring(0, 19).replace('T', ' ') : 'N/A'}`);
      console.log(`审批记录数: ${instance.approvals.length}`);
      console.log('');

      if (instance.approvals.length > 0) {
        console.log('=== 审批记录详情 ===');
        instance.approvals.forEach((approval, index) => {
          console.log(`${index + 1}. 审批ID: ${approval.id}`);
          console.log(`   节点ID: ${approval.nodeId}`);
          console.log(`   节点名称: ${approval.nodeName}`);
          console.log(`   审批人ID: ${approval.approverId}`);
          console.log(`   审批人姓名: ${approval.approverName || 'N/A'}`);
          console.log(`   操作: ${approval.action || '待审批'}`);
          console.log(`   状态: ${approval.status}`);
          console.log(`   审批时间: ${approval.approvedAt ? approval.approvedAt.toISOString().substring(0, 19).replace('T', ' ') : 'N/A'}`);
          console.log(`   备注: ${approval.comment || 'N/A'}`);
          console.log('');
        });
      }
    }
  }

  // 4. 查询关联的工时结果记录
  console.log('=== 工时结果记录 ===');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: 'LABOR_HOUR_REPORT',
      sourceId: report.id,
    },
  });

  if (workHourResults.length === 0) {
    console.log('❌ 未找到对应的工时结果记录');
    console.log('说明: 该工时报工尚未推送到工时结果表');
  } else {
    console.log(`✅ 找到 ${workHourResults.length} 条工时结果记录\n`);
    workHourResults.forEach((result, index) => {
      const customFields = result.customFields ? JSON.parse(result.customFields) : {};
      console.log(`${index + 1}. 工时结果ID: ${result.id}`);
      console.log(`   员工编号: ${result.employeeNo || 'N/A'}`);
      console.log(`   工作日期: ${result.workDate.toISOString().substring(0, 10)}`);
      console.log(`   UTC开始时间: ${result.startTime ? result.startTime.toISOString().substring(11, 19) : 'N/A'}`);
      console.log(`   UTC结束时间: ${result.endTime ? result.endTime.toISOString().substring(11, 19) : 'N/A'}`);
      console.log(`   本地开始时间: ${customFields.localStartTime || 'N/A'}`);
      console.log(`   本地结束时间: ${customFields.localEndTime || 'N/A'}`);
      console.log(`   工时: ${result.workHours} 小时`);
      console.log(`   出勤代码: ${result.attendanceCode || 'N/A'} (${result.attendanceCodeName || 'N/A'})`);
      console.log(`   账户: ${result.accountName || 'N/A'}`);
      console.log(`   状态: ${result.status}`);
      console.log(`   来源类型: ${result.sourceType}`);
      console.log(`   来源ID: ${result.sourceId}`);
      console.log(`   是否手动填报: ${customFields.isManualInput ? '是' : '否'}`);
      console.log(`   报工模式: ${customFields.reportMode || 'N/A'}`);
      console.log(`   创建时间: ${result.createdAt.toISOString().substring(0, 19).replace('T', ' ')}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  });
