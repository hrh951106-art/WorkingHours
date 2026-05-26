import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 创建支援申请流程定义 ===');

  // 1. 创建流程定义
  const workflowConfig = {
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: '开始' },
      },
      {
        id: 'approval',
        type: 'approval',
        position: { x: 300, y: 100 },
        data: {
          label: '部门主管审批',
          needAllApprove: false,
          approverStrategy: [1], // 假设参与者ID为1
        },
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 500, y: 100 },
        data: { label: '结束' },
      },
    ],
    edges: [
      {
        id: 'e-start-approval',
        source: 'start',
        target: 'approval',
        type: 'smoothstep',
      },
      {
        id: 'e-approval-end',
        source: 'approval',
        target: 'end',
        type: 'smoothstep',
      },
    ],
  };

  const workflow = await prisma.workflowDefinition.create({
    data: {
      name: '支援申请流程',
      code: 'SUPPORT_REQUEST_V1',
      category: 'SUPPORT_REQUEST',
      description: '跨部门/跨产线支援申请审批流程',
      version: 1,
      status: 'PUBLISHED',
      formConfig: '{}',
      flowConfig: JSON.stringify(workflowConfig),
      createdById: 1,
      createdByName: '系统管理员',
      updatedById: 1,
      updatedByName: '系统管理员',
    },
  });

  console.log('流程定义创建成功:', workflow);

  // 2. 创建节点
  const startNode = await prisma.workflowNode.create({
    data: {
      workflowId: workflow.id,
      nodeCode: 'wf_start_1',
      nodeType: 'start',
      nodeName: '开始',
      sortOrder: 0,
      status: 'ACTIVE',
    },
  });

  console.log('开始节点创建成功:', startNode);

  // 审批节点 - 使用参与者配置
  const approvalNode = await prisma.workflowNode.create({
    data: {
      workflowId: workflow.id,
      nodeCode: 'wf_approval_1',
      nodeType: 'approval',
      nodeName: '部门主管审批',
      needAllApprove: false, // 或签：任意一人审批通过即可
      approverStrategy: JSON.stringify([1]), // 使用第一个参与者配置
      sortOrder: 1,
      status: 'ACTIVE',
    },
  });

  console.log('审批节点创建成功:', approvalNode);

  const endNode = await prisma.workflowNode.create({
    data: {
      workflowId: workflow.id,
      nodeCode: 'wf_end_2',
      nodeType: 'end',
      nodeName: '结束',
      sortOrder: 2,
      status: 'ACTIVE',
    },
  });

  console.log('结束节点创建成功:', endNode);

  // 3. 创建边
  await prisma.workflowEdge.create({
    data: {
      workflowId: workflow.id,
      sourceNodeId: startNode.id,
      targetNodeId: approvalNode.id,
    },
  });

  await prisma.workflowEdge.create({
    data: {
      workflowId: workflow.id,
      sourceNodeId: approvalNode.id,
      targetNodeId: endNode.id,
    },
  });

  console.log('=== 流程创建完成 ===');
  console.log('流程ID:', workflow.id);
  console.log('流程编号:', workflow.code);
  console.log('流程分类:', workflow.category);

  // 验证
  const nodes = await prisma.workflowNode.findMany({
    where: { workflowId: workflow.id },
    orderBy: { sortOrder: 'asc' },
  });

  console.log('\n节点列表:');
  nodes.forEach((node) => {
    console.log(`  - ${node.nodeName} (${node.nodeType}) [sortOrder: ${node.sortOrder}]`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
