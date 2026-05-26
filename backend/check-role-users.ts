import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('角色和用户关系查询');
  console.log('='.repeat(80));
  console.log();

  // 查询所有角色
  const roles = await prisma.role.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { id: 'asc' },
  });

  console.log(`【系统角色列表】共 ${roles.length} 个`);
  console.log();

  for (const role of roles) {
    console.log(`角色ID ${role.id}: ${role.name} (${role.code})`);
    console.log(`  描述: ${role.description || '无'}`);
    console.log(`  状态: ${role.status}`);

    // 查询该角色关联的用户
    const userRoles = await prisma.userRole.findMany({
      where: { roleId: role.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            status: true,
          },
        },
      },
    });

    console.log(`  关联用户数: ${userRoles.length}`);

    if (userRoles.length > 0) {
      userRoles.forEach((ur) => {
        console.log(`    - 用户ID ${ur.user.id}: ${ur.user.name} (${ur.user.username}) - ${ur.user.status}`);
      });
    } else {
      console.log(`    ⚠️  该角色没有关联任何用户`);
    }

    console.log();
  }

  // 重点检查角色ID 1和2
  console.log('='.repeat(80));
  console.log('【重点检查】工时报工流程配置的角色');
  console.log('='.repeat(80));
  console.log();

  const checkRoleIds = [1, 2];
  for (const roleId of checkRoleIds) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      console.log(`⚠️  角色ID ${roleId} 不存在`);
      console.log();
      continue;
    }

    console.log(`角色ID ${roleId}: ${role.name} (${role.code})`);

    const userRoles = await prisma.userRole.findMany({
      where: { roleId },
      include: {
        user: true,
      },
    });

    if (userRoles.length === 0) {
      console.log(`  ❌ 问题: 该角色没有关联任何用户`);
      console.log(`  影响: 配置该角色的审批节点将找不到审批人，会显示"无审批人（自动通过）"`);
      console.log();
      console.log(`  解决方案:`);
      console.log(`  1. 进入系统管理 -> 角色管理`);
      console.log(`  2. 编辑角色"${role.name}"`);
      console.log(`  3. 为该角色分配用户`);
      console.log(`  或`);
      console.log(`  4. 修改工作流审批节点配置，使用"指定用户"策略`);
      console.log();
    } else {
      console.log(`  ✅ 该角色关联了 ${userRoles.length} 个用户:`);
      userRoles.forEach((ur) => {
        const statusText = ur.user.status === 'ACTIVE' ? '✅' : '❌';
        console.log(`     ${statusText} ${ur.user.name} (${ur.user.username}) - ${ur.user.status}`);
      });
      console.log();
    }
  }

  console.log('='.repeat(80));
}

main()
  .catch((e) => {
    console.error('执行出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
