import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询PunchPair ID 107的记录
  const punchPair = await prisma.punchPair.findUnique({
    where: { id: 107 },
  });

  if (punchPair) {
    const pairDate = new Date(punchPair.pairDate);
    console.log('PunchPair ID 107:');
    console.log(`  pairDate (原始): ${punchPair.pairDate}`);
    console.log(`  pairDate (ISO): ${pairDate.toISOString()}`);
    console.log(`  pairDate (本地): ${pairDate.toLocaleString('zh-CN')}`);
    console.log(`  pairDate (日期): ${pairDate.toISOString().split('T')[0]}`);
    console.log(`  pairDate (本地日期): ${pairDate.toLocaleDateString('zh-CN')}`);
    console.log('');
    console.log(`  员工: ${punchPair.employeeNo}`);
    console.log(`  shiftId: ${punchPair.shiftId}`);
    console.log(`  shiftName: ${punchPair.shiftName}`);
  }

  console.log('\n所有PunchPair记录:');
  const allPairs = await prisma.punchPair.findMany({
    orderBy: { id: 'desc' },
    take: 10,
  });

  allPairs.forEach(p => {
    const pairDate = new Date(p.pairDate);
    console.log(`ID: ${p.id}, pairDate: ${p.pairDate}, 本地日期: ${pairDate.toLocaleDateString('zh-CN')}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
