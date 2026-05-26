import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      employeeNo: true,
    }
  });

  console.log('所有用户:');
  users.forEach(u => {
    console.log(`  ID: ${u.id}, name: ${u.name}, employeeNo: ${u.employeeNo}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
