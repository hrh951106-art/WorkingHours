import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const reportNo = 'LABOR202605262052356560';

  console.log('='.repeat(80));
  console.log(`工时报工审批流程分析: ${reportNo}`);
  console.log('='.repeat(80));
  console.log();

  // 1. 查询工时报工记录
  const report = await prisma.laborHourReportRequest.findFirst({
    where: { requestNo: reportNo },
    include: {
      employees: true,
    },
  });

  if (!report) {
    console.log('未找到该工时报工记录');
    return;
  }

  console.log('【工时报工基本信息】');
  console.log(`  报工单号: ${report.requestNo}`);
  console.log(`  标题: ${report.title}`);
  console.log(`  状态: ${report.status}`);
  console.log(`  工作流实例ID: ${report.instanceId}`);
  console.log(`  发起人: ${report.requesterName}`);
  console.log(`  创建时间: ${report.createdAt}`);
  console.log();

  // 2. 查询工作流实例
  if (!report.instanceId) {
    console.log('该工时报工没有关联工作流实例');
    return;
  }

  const instance = await prisma.workflowInstance.findUnique({
    where: { id: report.instanceId },
    include: {
      definition: {
        include: {
          nodes: {
            where: { nodeType: 'approval' },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      approvals: {
        orderBy: { step: 'asc' },
      },
    },
  });

  if (!instance) {
    console.log('工作流实例不存在');
    return;
  }

  console.log('【工作流实例信息】');
  console.log(`  实例编号: ${instance.instanceNo}`);
  console.log(`  状态: ${instance.status}`);
  console.log(`  当前步骤: ${instance.currentStep || '无'}`);
  console.log(`  发起人: ${instance.initiatorName}`);
  console.log(`  发起组织: ${instance.initiatorOrgName}`);
  console.log(`  发起时间: ${instance.initiatedAt}`);
  console.log(`  完成时间: ${instance.finishedAt || '未完成'}`);
  console.log();

  // 3. 查询工作流定义和节点配置
  if (instance.definition) {
    console.log('【工作流定义信息】');
    console.log(`  定义ID: ${instance.definition.id}`);
    console.log(`  流程名称: ${instance.definition.name}`);
    console.log(`  流程代码: ${instance.definition.code}`);
    console.log(`  版本: ${instance.definition.versionString}`);
    console.log(`  状态: ${instance.definition.status}`);
    console.log();

    // 4. 查询审批节点配置
    if (instance.definition.nodes.length > 0) {
      console.log(`【审批节点配置】共 ${instance.definition.nodes.length} 个节点`);
      console.log();

      for (let i = 0; i < instance.definition.nodes.length; i++) {
        const node = instance.definition.nodes[i];
        console.log(`节点${i + 1}: ${node.nodeName}`);
        console.log(`  节点ID: ${node.id}`);
        console.log(`  节点代码: ${node.nodeCode}`);
        console.log(`  排序: ${node.sortOrder}`);
        console.log(`  审批人策略字段: ${node.approverStrategy}`);

        // 解析审批人策略
        let approverStrategy: any = [];
        try {
          approverStrategy = node.approverStrategy ? JSON.parse(node.approverStrategy) : [];
        } catch (e) {
          approverStrategy = node.approverStrategy || [];
        }
        console.log(`  审批人策略解析后: ${JSON.stringify(approverStrategy)}`);

        if (approverStrategy.type === 'specific_user') {
          console.log(`  策略类型: 指定用户`);
          console.log(`  用户ID列表: ${approverStrategy.userIds?.join(', ') || '无'}`);
        } else if (approverStrategy.type === 'role') {
          console.log(`  策略类型: 角色审批`);
          console.log(`  角色ID: ${approverStrategy.roleId || '无'}`);
        } else if (approverStrategy.type === 'org_leader') {
          console.log(`  策略类型: 组织主管`);
        } else if (approverStrategy.type === 'initiator_leader') {
          console.log(`  策略类型: 发起人主管`);
        } else if (Array.isArray(approverStrategy) && approverStrategy.length > 0) {
          console.log(`  策略类型: 角色ID数组 (旧格式)`);
          console.log(`  角色ID列表: ${approverStrategy.join(', ')}`);
        } else {
          console.log(`  策略类型: 未知或未配置`);
        }

        console.log(`  需要全部审批: ${node.needAllApprove ? '是' : '否'}`);
        console.log();
      }
    }

    // 5. 查询审批执行记录
    if (instance.approvals.length > 0) {
      console.log(`【审批执行记录】共 ${instance.approvals.length} 条`);
      console.log();

      for (let i = 0; i < instance.approvals.length; i++) {
        const approval = instance.approvals[i];
        console.log(`记录${i + 1}:`);
        console.log(`  节点名称: ${approval.nodeName}`);
        console.log(`  节点ID: ${approval.nodeId}`);
        console.log(`  步骤: ${approval.step}`);
        console.log(`  审批人ID: ${approval.approverId}`);
        console.log(`  审批人姓名: ${approval.approverName}`);
        console.log(`  审批人列表: ${approval.approvers}`);

        // 解析审批人列表
        let approvers: any[] = [];
        try {
          approvers = approval.approvers ? JSON.parse(approval.approvers) : [];
        } catch (e) {
          approvers = [];
        }
        console.log(`  审批人数量: ${approvers.length}`);

        console.log(`  动作: ${approval.action || '未审批'}`);
        console.log(`  状态: ${approval.status}`);
        console.log(`  审批时间: ${approval.approvedAt || '未审批'}`);
        console.log(`  审批意见: ${approval.comment || '无'}`);
        console.log();
      }
    }
  }

  // 6. 分析问题
  console.log('【问题分析】');
  console.log();

  if (instance.status === 'COMPLETED' && report.status === 'PENDING') {
    console.log('⚠️  问题: 工作流已完成，但工时报工状态仍为PENDING');
    console.log('   原因: 工作流完成后缺少回调机制更新工时报工状态');
    console.log('   影响: 工时报工数据不会同步到工时结果表');
  }

  const hasNoApprover = instance.approvals.some(a => a.approverId === 0);
  if (hasNoApprover) {
    console.log('⚠️  问题: 存在无审批人的节点');
    console.log('   原因: 审批人策略配置的角色没有关联用户');
    console.log('   影响: 节点显示为"无审批人（自动通过）"');
  }

  console.log();
  console.log('='.repeat(80));
}

main()
  .catch((e) => {
    console.error('执行出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
