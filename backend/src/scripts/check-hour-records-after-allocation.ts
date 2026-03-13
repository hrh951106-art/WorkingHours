import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHourRecordsAfterAllocation() {
  console.log('========================================');
  console.log('检查工时记录数据');
  console.log('========================================\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  // 1. 统计所有工时记录
  console.log('第一步：统计所有工时记录\n');

  const totalRecords = await prisma.calcResult.count({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  console.log(`总工时记录数: ${totalRecords}`);

  // 2. 按出勤代码分组统计
  console.log('\n第二步：按出勤代码统计\n');

  const attendanceCodeStats = await prisma.calcResult.groupBy({
    by: ['attendanceCodeId'],
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      actualHours: true,
    },
  });

  console.log('出勤代码统计:');
  for (const stat of attendanceCodeStats) {
    const code = await prisma.attendanceCode.findUnique({
      where: { id: stat.attendanceCodeId || 0 },
    });

    console.log(`  ${code?.code || 'NULL'} (${code?.name || 'Unknown'}): ${stat._count.id} 条记录, 总工时 ${stat._sum.actualHours || 0}`);
  }

  // 3. 按账户名称后缀分组统计
  console.log('\n第三步：按账户类型统计\n');

  const allRecords = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      accountName: true,
    },
  });

  const accountTypeStats: Record<string, number> = {};
  for (const record of allRecords) {
    let type = '其他';
    if (record.accountName?.endsWith('间接设备')) {
      type = '间接设备';
    } else if (record.accountName?.includes('产线') && record.accountName?.includes('////')) {
      type = '产线间接设备';
    } else if (record.accountName?.includes('车间')) {
      type = '车间';
    } else if (record.accountName?.includes('工厂')) {
      type = '工厂';
    }

    accountTypeStats[type] = (accountTypeStats[type] || 0) + 1;
  }

  console.log('账户类型统计:');
  for (const [type, count] of Object.entries(accountTypeStats)) {
    console.log(`  ${type}: ${count} 条记录`);
  }

  // 4. 检查是否有账户名称包含"车间"但不包含"间接设备"的记录
  console.log('\n第四步：检查车间和工厂的原始工时记录\n');

  const workshopOriginalRecords = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
      accountName: {
        contains: 'W1总装车间/////间接设备',
      },
      NOT: {
        accountName: {
          contains: '产线',
        },
      },
    },
    take: 10,
  });

  console.log(`车间间接设备记录（不含产线）: ${workshopOriginalRecords.length} 条`);
  for (const record of workshopOriginalRecords) {
    const code = await prisma.attendanceCode.findUnique({
      where: { id: record.attendanceCodeId || 0 },
    });
    console.log(`  账户: ${record.accountName}`);
    console.log(`  出勤代码: ${code?.code || 'NULL'}`);
    console.log(`  员工: ${record.employeeNo}, 工时: ${record.actualHours}`);
    console.log();
  }

  // 5. 检查I04车间工时记录
  console.log('\n第五步：检查I04车间工时记录\n');

  const i04Records = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
      attendanceCodeId: 4, // I04
    },
    take: 10,
  });

  console.log(`I04车间工时记录: ${i04Records.length} 条`);
  for (const record of i04Records) {
    console.log(`  账户: ${record.accountName}`);
    console.log(`  员工: ${record.employeeNo}, 工时: ${record.actualHours}`);
    console.log(`  日期: ${record.calcDate.toISOString().split('T')[0]}`);
    console.log();
  }

  // 6. 检查I01线体工时记录
  console.log('\n第六步：检查I01线体工时记录\n');

  const i01Records = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
      attendanceCodeId: 1, // I01
    },
    take: 10,
  });

  console.log(`I01线体工时记录: ${i01Records.length} 条`);
  for (const record of i01Records) {
    console.log(`  账户: ${record.accountName}`);
    console.log(`  员工: ${record.employeeNo}, 工时: ${record.actualHours}`);
    console.log(`  日期: ${record.calcDate.toISOString().split('T')[0]}`);
    console.log();
  }

  console.log('========================================\n');
}

checkHourRecordsAfterAllocation()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
