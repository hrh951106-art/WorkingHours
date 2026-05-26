import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查找节点26的多余审批记录（李四的记录）
  const excessApprovals = await prisma.workflowApproval.findMany({
    where: {
      nodeId: 26, // 第一个审批节点
      approverId: 4, // 李四
      action: '', // 未审批的记录
    },
  });

  console.log('=== 找到', excessApprovals.length, '条多余的审批记录 ===');

  for (const approval of excessApprovals) {
    console.log(`\n删除审批记录:`);
    console.log('  ID:', approval.id);
    console.log('  实例ID:', approval.instanceId);
    console.log('  审批人:', approval.approverName);
    console.log('  节点:', approval.nodeName);

    await prisma.workflowApproval.delete({
      where: { id: approval.id },
    });
    console.log('  ✓ 已删除');
  }

  console.log('\n=== 修复完成 ===');
  console.log('现在节点26只有Aaron.he的审批记录');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
