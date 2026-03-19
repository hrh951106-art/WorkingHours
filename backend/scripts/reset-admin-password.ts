import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const newPassword = '1qaz2wsx';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 检查admin用户是否存在
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (!adminUser) {
      console.log('Admin用户不存在，正在创建...');

      // 创建admin用户
      const newAdmin = await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: '系统管理员',
          email: 'admin@system.com',
          status: 'ACTIVE',
        },
      });

      console.log('Admin用户创建成功:', {
        id: newAdmin.id,
        username: newAdmin.username,
        name: newAdmin.name,
      });
    } else {
      // 更新admin用户密码
      await prisma.user.update({
        where: { username: 'admin' },
        data: {
          password: hashedPassword,
        },
      });

      console.log('Admin用户密码更新成功:', {
        id: adminUser.id,
        username: adminUser.username,
        name: adminUser.name,
      });
    }

    console.log('\n新密码: 1qaz2wsx');
  } catch (error) {
    console.error('重置密码失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
