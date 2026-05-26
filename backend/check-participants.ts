import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const participants = await prisma.workflowParticipant.findMany({
    where: { id: { in: [1, 2] } },
  });

  console.log('=== 参与者配置详情 ===');
  for (const p of participants) {
    console.log('\n配置 ID:', p.id);
    console.log('  名称:', p.name);
    console.log('  类型:', p.type);
    console.log('  participants字段 (原始):', p.participants);
    console.log('  participants字段 (解析):', p.participants ? JSON.parse(p.participants) : null);
    console.log('  状态:', p.status);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
