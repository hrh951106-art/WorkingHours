import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAccountNames() {
  console.log('修复账户名称...\n');

  // 更新账户137的名称
  const account1 = await prisma.laborAccount.update({
    where: { id: 137 },
    data: {
      name: '富阳工厂/W1总装车间/////间接设备',
      path: '/富阳工厂/W1总装车间/////间接设备',
      namePath: '/富阳工厂/W1总装车间/////间接设备',
    },
  });
  console.log('已更新账户137:', account1.name);

  // 更新账户145的名称
  const account2 = await prisma.laborAccount.update({
    where: { id: 145 },
    data: {
      name: '富阳工厂//////间接设备',
      path: '/富阳工厂//////间接设备',
      namePath: '/富阳工厂//////间接设备',
    },
  });
  console.log('已更新账户145:', account2.name);

  console.log('\n完成！');
  await prisma.$disconnect();
}

fixAccountNames().catch(e => {
  console.error('失败:', e);
  process.exit(1);
});
