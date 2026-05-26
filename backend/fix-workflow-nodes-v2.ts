import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixWorkflowNodes() {
  console.log('开始修复工作流节点...');

  try {
    // 获取工时报工工作流的审批节点
    const approvalNode = await prisma.workflowNode.findFirst({
      where: {
        workflowId: 5,
        nodeType: 'APPROVAL'
      }
    });

    if (!approvalNode) {
      console.error('审批节点不存在');
      return;
    }

    console.log('审批节点:', approvalNode);

    // 更新审批节点的 approverStrategy 为 JSON 数组格式
    // 创建一个 ORG_MANAGER 类型的参与者配置
    const participant = await prisma.workflowParticipant.create({
      data: {
        code: `LABOR_HOUR_DEPT_LEADER_${Date.now()}`,
        name: '部门主管',
        type: 'ORG_MANAGER',
        participants: JSON.stringify([{
          subjectType: 'APPLICANT',
          orgLevel: 0
        }]),
        description: '申请人所在部门的部门主管',
        status: 'ACTIVE',
      }
    });

    console.log('创建参与者配置:', participant);

    // 更新审批节点的 approverStrategy 为参与者ID数组
    await prisma.workflowNode.update({
      where: { id: approvalNode.id },
      data: {
        approverStrategy: JSON.stringify([participant.id])
      }
    });

    console.log('工作流节点修复成功！');
  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixWorkflowNodes();
