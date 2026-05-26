import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: 43 },
    include: {
      approvals: {
        orderBy: { approvedAt: 'desc' },
      },
    },
  });

  if (!instance) {
    console.log('实例不存在');
    return;
  }

  console.log('=== 工作流实例详情 ===');
  console.log('实例ID:', instance.id);
  console.log('实例编号:', instance.instanceNo);
  console.log('状态:', instance.status);
  console.log('当前节点:', instance.currentNodes);
  console.log('\n审批记录数量:', instance.approvals.length);

  instance.approvals.forEach((approval: any, index: number) => {
    console.log('\n审批记录', index + 1, ':');
    console.log('  节点ID:', approval.nodeId);
    console.log('  节点代码:', approval.nodeCode);
    console.log('  审批人ID:', approval.approverId);
    console.log('  审批人:', approval.approverName);
    console.log('  审批动作:', approval.action || '未审批');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
