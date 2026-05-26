import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLaborHourWorkflowNodes() {
  console.log('开始修复工时报工工作流节点...');

  try {
    // 获取工时报工工作流定义
    const workflow = await prisma.workflowDefinition.findUnique({
      where: { code: 'LABOR_HOUR_REPORT' },
    });

    if (!workflow) {
      console.error('工时报工工作流定义不存在');
      return;
    }

    console.log('工时报工工作流ID:', workflow.id);

    // 删除旧的节点（如果存在）
    await prisma.workflowNode.deleteMany({
      where: { workflowId: workflow.id },
    });

    console.log('已删除旧的节点');

    // 创建新的节点（使用唯一的nodeCode）
    const timestamp = Date.now();
    const nodes = [
      {
        workflowId: workflow.id,
        nodeCode: `wf${workflow.id}_start_${timestamp}_0`,
        nodeType: 'START',
        nodeName: '开始节点',
        sortOrder: 0,
        status: 'ACTIVE',
      },
      {
        workflowId: workflow.id,
        nodeCode: `wf${workflow.id}_dept_approval_${timestamp}_1`,
        nodeType: 'APPROVAL',
        nodeName: '部门主管审批',
        approvalType: 'SINGLE',
        approverStrategy: 'DEPT_LEADER',
        approverConfig: '{}',
        sortOrder: 1,
        status: 'ACTIVE',
      },
      {
        workflowId: workflow.id,
        nodeCode: `wf${workflow.id}_end_${timestamp}_2`,
        nodeType: 'END',
        nodeName: '结束节点',
        sortOrder: 2,
        status: 'ACTIVE',
      },
    ];

    for (const node of nodes) {
      await prisma.workflowNode.create({ data: node });
      console.log(`创建节点: ${node.nodeName} (${node.nodeCode})`);
    }

    console.log('工时报工工作流节点修复成功！');
  } catch (error) {
    console.error('修复工时报工工作流节点时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixLaborHourWorkflowNodes();
