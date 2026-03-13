import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAndRerunAllocation() {
  console.log('========================================');
  console.log('清理并重新执行分摊');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 删除分摊结果
  console.log('1. 删除分摊结果...');
  const deleteResult = await prisma.allocationResult.deleteMany({
    where: {
      recordDate: calcDate,
    },
  });
  console.log(`   删除了 ${deleteResult.count} 条分摊结果\n`);

  // 2. 删除分摊产生的工时记录（间接工时）
  console.log('2. 删除分摊产生的工时记录...');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  if (!generalConfig || !generalConfig.indirectHoursAllocationCode) {
    console.log('   未配置间接工时代码，跳过\n');
  } else {
    const indirectHoursCode = await prisma.attendanceCode.findUnique({
      where: { code: generalConfig.indirectHoursAllocationCode },
    });

    if (indirectHoursCode) {
      const deleteCalcResult = await prisma.calcResult.deleteMany({
        where: {
          calcDate,
          attendanceCodeId: indirectHoursCode.id,
        },
      });
      console.log(`   删除了 ${deleteCalcResult.count} 条间接工时记录\n`);
    }
  }

  // 3. 调用分摊API
  console.log('3. 调用分摊API...');
  console.log('   请在界面上执行分摊操作\n');

  console.log('========================================');
  console.log('清理完成，请执行分摊操作');
  console.log('========================================');
}

cleanAndRerunAllocation()
  .catch((e) => {
    console.error('操作失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
