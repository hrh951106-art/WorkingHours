/**
 * 更新admin账户密码脚本
 * 用法：npx ts-node update-admin-password.ts
 */

import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminPassword() {
  const newPassword = '1qaz2wsx';

  try {
    // 生成新的密码哈希
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('生成的密码哈希:', hashedPassword);

    // 更新admin用户的密码
    const updatedUser = await prisma.user.updateMany({
      where: {
        username: 'admin',
      },
      data: {
        password: hashedPassword,
      },
    });

    console.log('✓ 密码更新成功！');
    console.log(`  - 影响行数: ${updatedUser.count}`);
    console.log(`  - 用户名: admin`);
    console.log(`  - 新密码: ${newPassword}`);

    if (updatedUser.count === 0) {
      console.log('⚠ 警告: 未找到admin用户，请确认用户是否存在');
    }
  } catch (error) {
    console.error('✗ 密码更新失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行出错:', error);
    process.exit(1);
  });
