import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrganizationData() {
  console.log('========================================');
  console.log('检查组织管理数据');
  console.log('========================================\n');

  // 查找所有组织
  const organizations = await prisma.organization.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      level: 'asc',
    },
  });

  console.log(`找到 ${organizations.length} 个组织:\n`);

  for (const org of organizations) {
    const parent = org.parentId ? await prisma.organization.findUnique({
      where: { id: org.parentId },
      select: { name: true },
    }) : null;

    console.log(`----------------------------------------`);
    console.log(`组织ID: ${org.id}`);
    console.log(`组织代码: ${org.code}`);
    console.log(`组织名称: ${org.name}`);
    console.log(`组织类型: ${org.type}`);
    console.log(`层级: ${org.level}`);
    console.log(`父组织: ${parent ? parent.name : '无'}`);
    console.log(`状态: ${org.status}`);
  }

  console.log('\n========================================');
  console.log('查找车间类型的组织');
  console.log('========================================\n');

  // 查找车间类型的组织
  const workshops = await prisma.organization.findMany({
    where: {
      type: 'WORKSHOP',
      status: 'ACTIVE',
    },
  });

  console.log(`找到 ${workshops.length} 个车间:\n`);

  for (const workshop of workshops) {
    console.log(`  车间ID: ${workshop.id}`);
    console.log(`  车间代码: ${workshop.code}`);
    console.log(`  车间名称: ${workshop.name}`);
    console.log();
  }

  console.log('========================================');
}

checkOrganizationData()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
