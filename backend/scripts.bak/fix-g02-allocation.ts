import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 修复G02分摊计算问题 ===\n');

  // 方案1: 创建更多I05出勤代码的工时记录
  console.log('方案1: 为现有工时记录创建I05副本...\n');

  // 获取I05出勤代码
  const i05Code = await prisma.attendanceCode.findUnique({
    where: { code: 'I05' },
  });

  if (!i05Code) {
    console.error('错误: 未找到I05出勤代码');
    return;
  }

  // 获取现有的工时记录（使用I01/I02/I03的）
  const existingRecords = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: new Date('2026-03-01'),
        lt: new Date('2026-03-12'),
      },
      attendanceCode: {
        code: {
          in: ['I01', 'I02', 'I03'],
        },
      },
    },
    include: {
      employee: true,
    },
    take: 10,
  });

  console.log(`找到 ${existingRecords.length} 条现有工时记录`);

  // 为这些记录创建I05副本
  let createdCount = 0;
  for (const record of existingRecords) {
    // 检查是否已存在该员工、该日期、该出勤代码的记录
    const existing = await prisma.calcResult.findFirst({
      where: {
        employeeNo: record.employeeNo,
        calcDate: record.calcDate,
        attendanceCodeId: i05Code.id,
      },
    });

    if (!existing) {
      await prisma.calcResult.create({
        data: {
          employeeNo: record.employeeNo,
          accountId: record.accountId,
          accountName: record.accountName,
          calcDate: record.calcDate,
          attendanceCodeId: i05Code.id,
          actualHours: record.actualHours,
          standardHours: record.standardHours || 0,
          status: 'COMPLETED',
          shiftId: record.shiftId,
          shiftName: record.shiftName,
        },
      });
      createdCount++;
      console.log(`  ✓ 创建: ${record.employeeNo} - ${record.calcDate.toISOString().split('T')[0]} - I05 - ${record.actualHours}h`);
    }
  }

  console.log(`\n成功创建 ${createdCount} 条I05工时记录\n`);

  // 方案2: 检查账户筛选问题
  console.log('方案2: 检查账户层级配置...\n');

  // 查看G02配置的详细筛选条件
  const g02Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: { contains: 'G02' },
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
    },
  });

  if (g02Config && g02Config.sourceConfig) {
    const accountFilter = JSON.parse(g02Config.sourceConfig.accountFilter || '{}');
    console.log('G02账户筛选条件:');
    console.log(JSON.stringify(accountFilter, null, 2));

    // 如果有层级筛选，检查现有账户是否符合
    if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
      console.log('\n建议:');
      console.log('  当前账户筛选条件可能过于严格，导致找不到符合条件的账户');
      console.log('  建议修改G02配置，放宽账户筛选条件：');
      console.log('  1. 去掉设备类型的筛选');
      console.log('  2. 或者改为只按工厂筛选（不按设备类型）');
    }
  }

  console.log('\n=== 修复完成 ===');
  console.log('\n请尝试重新执行G02分摊计算');
  console.log('如果仍然失败，请修改G02配置的账户筛选条件');
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
