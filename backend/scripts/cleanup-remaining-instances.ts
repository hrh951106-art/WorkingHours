import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('查询剩余的工时报工流程实例...\n');

  // 查询所有工时报工类型的流程实例
  const instances = await prisma.workflowInstance.findMany({
    where: {
      category: 'LABOR_HOUR_REPORT'
    },
    include: {
      approvals: true
    }
  });

  console.log(`找到 ${instances.length} 个工时报工流程实例\n`);

  if (instances.length === 0) {
    console.log('没有剩余的工时报工流程实例');
    return;
  }

  // 显示实例信息
  for (let i = 0; i < instances.length; i++) {
    const instance = instances[i];
    console.log(`${i + 1}. 实例ID: ${instance.id}`);
    console.log(`   标题: ${instance.title}`);
    console.log(`   状态: ${instance.status}`);
    console.log(`   发起人: ${instance.initiatorName}`);
    console.log(`   发起时间: ${instance.initiatedAt.toISOString().substring(0, 19).replace('T', ' ')}`);
    console.log(`   审批记录数: ${instance.approvals.length}`);
    console.log('');
  }

  // 删除这些流程实例及其审批记录
  console.log('开始删除剩余流程实例...\n');

  const instanceIds = instances.map(i => i.id);

  await prisma.$transaction(async (tx) => {
    // 删除审批记录
    const deletedApprovals = await tx.workflowApproval.deleteMany({
      where: {
        instanceId: { in: instanceIds }
      }
    });
    console.log(`✓ 删除 ${deletedApprovals.count} 条审批记录`);

    // 删除流程实例
    const deletedInstances = await tx.workflowInstance.deleteMany({
      where: {
        id: { in: instanceIds }
      }
    });
    console.log(`✓ 删除 ${deletedInstances.count} 个流程实例`);
  });

  console.log('\n✅ 删除完成！');

  // 再次验证
  const remaining = await prisma.workflowInstance.count({
    where: {
      category: 'LABOR_HOUR_REPORT'
    }
  });

  console.log(`\n剩余工时报工流程实例: ${remaining} 个`);
}

main()
  .catch((e) => {
    console.error('删除失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
