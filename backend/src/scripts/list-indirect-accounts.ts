import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listIndirectAccounts() {
  const accounts = await prisma.laborAccount.findMany({
    where: {
      name: {
        endsWith: '间接设备',
      },
      status: 'ACTIVE',
    },
  });

  console.log('找到', accounts.length, '个间接设备账户:\n');
  for (const acc of accounts) {
    console.log(`  ${acc.name} (ID: ${acc.id})`);
  }
}

listIndirectAccounts().then(() => prisma.$disconnect()).catch(e => {
  console.error(e);
  process.exit(1);
});
