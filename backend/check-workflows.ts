import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查询所有工作流定义 ===');

  const workflows = await prisma.workflowDefinition.findMany({
    include: {
      nodes: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  console.log(`找到 ${workflows.length} 个工作流\n`);

  workflows.forEach((workflow) => {
    console.log(`\n工作流: ${workflow.name} (ID: ${workflow.id})`);
    console.log(`  描述: ${workflow.description || '无'}`);
    console.log(`  状态: ${workflow.status}`);
    console.log(`  节点数: ${workflow.nodes.length}`);

    workflow.nodes.forEach((node) => {
      console.log(`    - ${node.nodeName} (${node.nodeCode})`);
      console.log(`      类型: ${node.nodeType}`);
      console.log(`      审批方式: ${node.approvalType}`);
      console.log(`      审批人策略: ${node.approverStrategy}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
