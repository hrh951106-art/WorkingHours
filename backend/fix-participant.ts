import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 修改参与者配置1，只保留Aaron.he
  const updated = await prisma.workflowParticipant.update({
    where: { id: 1 },
    data: {
      participants: JSON.stringify([
        {
          type: 'FIXED_USER',
          userIds: [3], // 只保留Aaron.he
          userNames: ['Aaron.he']
        }
      ]),
    },
  });

  console.log('=== 修改成功 ===');
  console.log('配置ID:', updated.id);
  console.log('名称:', updated.name);
  console.log('新的participants配置:', updated.participants);
  console.log('\n现在该配置只包含Aaron.he一人');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
