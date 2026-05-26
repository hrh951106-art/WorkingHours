import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // 查找admin用户
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!admin) {
      console.log('未找到admin用户');
      await prisma.$disconnect();
      return;
    }

    console.log('=== Admin用户信息 ===');
    console.log('ID:', admin.id);
    console.log('用户名:', admin.username);
    console.log('姓名:', admin.name);
    console.log('状态:', admin.status);

    console.log('\n=== Admin用户的角色 ===');
    if (admin.userRoles && admin.userRoles.length > 0) {
      admin.userRoles.forEach((userRole, index) => {
        const role = userRole.role;
        console.log(`\n角色 ${index + 1}:`);
        console.log('  ID:', role.id);
        console.log('  代码:', role.code);
        console.log('  名称:', role.name);
        console.log('  状态:', role.status);
        console.log('  描述:', role.description);
      });
    } else {
      console.log('Admin用户没有任何角色！');
    }

    // 查找系统管理员角色
    const adminRole = await prisma.role.findFirst({
      where: { code: 'ADMIN' },
    });

    console.log('\n=== 系统管理员角色 ===');
    if (adminRole) {
      console.log('ID:', adminRole.id);
      console.log('代码:', adminRole.code);
      console.log('名称:', adminRole.name);
      console.log('状态:', adminRole.status);

      // 检查admin用户是否有这个角色
      const userRole = await prisma.userRole.findFirst({
        where: {
          userId: admin.id,
          roleId: adminRole.id,
        },
      });

      console.log('\n=== 用户角色关联 ===');
      if (userRole) {
        console.log('Admin用户拥有系统管理员角色');
      } else {
        console.log('Admin用户没有系统管理员角色！');

        // 添加系统管理员角色
        console.log('\n正在为admin用户添加系统管理员角色...');
        await prisma.userRole.create({
          data: {
            userId: admin.id,
            roleId: adminRole.id,
          },
        });
        console.log('✅ 已为admin用户添加系统管理员角色');
      }
    } else {
      console.log('未找到系统管理员角色！');
    }

    // 验证修改后的结果
    const updatedAdmin = await prisma.user.findUnique({
      where: { username: 'admin' },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log('\n=== 修改后的Admin用户角色 ===');
    if (updatedAdmin?.userRoles) {
      updatedAdmin.userRoles.forEach((userRole, index) => {
        console.log(`角色 ${index + 1}: ${userRole.role.name} (${userRole.role.code})`);
      });
    }

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
