import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询最近的计算结果
  const results = await prisma.calculationResult.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      employeeNo: true,
      calcDate: true,
      accountId: true,
      accountName: true,
      accountPath: true,
      punchAccountId: true,
      punchAccountName: true,
      calculationAttendanceCodeId: true,
      actualHours: true,
      createdAt: true,
    },
  });

  console.log('最近3条计算结果:');
  console.log(JSON.stringify(results, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
