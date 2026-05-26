import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查找所有支援申请
  const requests = await prisma.supportRequest.findMany({
    include: {
      instance: {
        select: {
          id: true,
          initiatorId: true,
          initiatorName: true,
          status: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log('所有支援申请：');
  console.log(JSON.stringify(requests, null, 2));

  // 查找用户Aaron.he
  const user = await prisma.user.findFirst({
    where: {
      name: 'Aaron.he'
    },
    select: {
      id: true,
      name: true
    }
  });

  console.log('\n当前用户 Aaron.he：');
  console.log(JSON.stringify(user, null, 2));

  // 查找4月8日和9日的申请
  const aprilRequests = requests.filter(r => {
    const date = new Date(r.createdAt);
    return (date.getDate() === 8 || date.getDate() === 9) && date.getMonth() === 3; // 3是四月（0-11）
  });

  console.log('\n4月8日和9日的申请：');
  console.log(JSON.stringify(aprilRequests, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
