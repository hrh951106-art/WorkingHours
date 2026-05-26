import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 验证实例43的审批记录
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

  console.log('=== 实例', instance.instanceNo, '审批记录验证 ===');
  console.log('状态:', instance.status);
  console.log('当前节点:', instance.currentNodes);
  console.log('\n审批记录:');

  instance.approvals.forEach((approval: any) => {
    console.log(`\n- 节点: ${approval.nodeName}`);
    console.log('  审批人:', approval.approverName);
    console.log('  审批动作:', approval.action || '待审批');
  });

  console.log('\n=== 验证结果 ===');
  const node26Approvals = instance.approvals.filter((a: any) => a.nodeId === 26);
  console.log('节点26的审批人数:', node26Approvals.length);
  console.log('应该是: 1人（Aaron.he）');
  console.log(node26Approvals.length === 1 && node26Approvals[0].approverName === 'Aaron.he' ? '✓ 正确' : '✗ 错误');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
