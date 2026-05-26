import { PrismaService } from '../src/database/prisma.service';

const prisma = new PrismaService();

async function testWorkflowData() {
  console.log('=== 测试工作流数据 ===\n');

  // 1. 检查工作流定义
  console.log('1. 工作流定义:');
  const workflows = await prisma.workflowDefinition.findMany({
    where: {
      category: 'LABOR_HOUR_REPORT',
      status: 'PUBLISHED',
      deletedAt: null,
    },
    include: {
      nodes: {
        where: {
          nodeType: 'approval',
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
  });

  console.log(`找到 ${workflows.length} 个工作流定义`);
  workflows.forEach(w => {
    console.log(`  - ID: ${w.id}, Code: ${w.code}, Name: ${w.name}`);
    console.log(`    节点数量: ${w.nodes?.length || 0}`);
    if (w.nodes) {
      w.nodes.forEach(n => {
        console.log(`      节点: ${n.nodeName} (ID: ${n.id}, SortOrder: ${n.sortOrder})`);
      });
    }
  });

  // 2. 检查最近的工作流实例
  console.log('\n2. 最近的工作流实例:');
  const instances = await prisma.workflowInstance.findMany({
    where: {
      category: 'LABOR_HOUR_REPORT',
    },
    include: {
      definition: {
        include: {
          nodes: {
            where: {
              nodeType: 'approval',
            },
          },
        },
      },
      approvals: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 3,
  });

  console.log(`找到 ${instances.length} 个工作流实例`);
  instances.forEach(i => {
    console.log(`  - ID: ${i.id}, No: ${i.instanceNo}, Status: ${i.status}`);
    console.log(`    Definition: ${i.definition ? `ID ${i.definition.id}` : 'NULL'}`);
    console.log(`    Definition Nodes: ${i.definition?.nodes?.length || 0}`);
    console.log(`    Approvals: ${i.approvals?.length || 0}`);
  });

  // 3. 检查最近创建失败的原因
  console.log('\n3. 检查数据完整性:');
  const latestInstance = await prisma.workflowInstance.findFirst({
    where: {
      category: 'LABOR_HOUR_REPORT',
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      definition: true,
    },
  });

  if (latestInstance) {
    console.log(`最新实例 ID: ${latestInstance.id}`);
    console.log(`关联的 workflowId: ${latestInstance.workflowId}`);

    const matchingDefinition = await prisma.workflowDefinition.findFirst({
      where: {
        id: latestInstance.workflowId,
      },
    });

    if (matchingDefinition) {
      console.log(`找到匹配的工作流定义: ID ${matchingDefinition.id}`);
      console.log(`工作流定义状态: ${matchingDefinition.status}`);
      console.log(`工作流定义删除时间: ${matchingDefinition.deletedAt}`);
    } else {
      console.log('❌ 没有找到匹配的工作流定义!');
    }
  }
}

testWorkflowData()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
