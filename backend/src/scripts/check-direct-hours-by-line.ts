import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDirectHoursByLine() {
  console.log('========================================');
  console.log('检查各产线的直接工时数据');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 查询I04出勤代码（车间工时）
  const attendanceCode = await prisma.attendanceCode.findUnique({
    where: { code: 'I04' },
  });

  if (!attendanceCode) {
    console.log('✗ 未找到出勤代码 I04');
    await prisma.$disconnect();
    return;
  }

  console.log(`出勤代码: ${attendanceCode.code} (${attendanceCode.name})\n`);

  // 查询当天的所有工时记录
  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate,
      attendanceCodeId: attendanceCode.id,
    },
    include: {
      employee: true,
    },
  });

  console.log(`找到 ${calcResults.length} 条工时记录\n`);

  // 按账户分组统计
  const accountStats: Record<string, { count: number; totalHours: number; employeeCount: number }> = {};

  for (const record of calcResults) {
    const account = record.accountName || 'Unknown';
    if (!accountStats[account]) {
      accountStats[account] = { count: 0, totalHours: 0, employeeCount: 0 };
    }
    accountStats[account].count += 1;
    accountStats[account].totalHours += record.actualHours;
    accountStats[account].employeeCount += 1;
  }

  console.log('按账户统计:\n');

  for (const [account, stats] of Object.entries(accountStats)) {
    console.log(`账户: ${account}`);
    console.log(`  记录数: ${stats.count}`);
    console.log(`  员工数: ${stats.employeeCount}`);
    console.log(`  总工时: ${stats.totalHours}`);
    console.log();
  }

  // 分析W1车间产线的直接工时情况
  console.log('========================================');
  console.log('W1车间产线的直接工时情况');
  console.log('========================================\n');

  const w1WorkshopId = 6; // W1总装车间的ID

  // 查询W1车间的所有产线
  const w1Lines = await prisma.productionLine.findMany({
    where: {
      workshopId: w1WorkshopId,
      deletedAt: null,
    },
  });

  console.log(`W1车间的产线:\n`);

  for (const line of w1Lines) {
    console.log(`产线: ${line.name} (ID: ${line.id})`);
    console.log(`  车间ID: ${line.workshopId}`);
    console.log(`  车间名称: ${line.workshopName || 'NULL'}`);

    // 查询该产线的直接设备账户
    const directAccount = await prisma.laborAccount.findFirst({
      where: {
        name: {
          contains: `${line.name}////直接设备`,
        },
        status: 'ACTIVE',
      },
    });

    if (directAccount) {
      console.log(`  直接设备账户: ${directAccount.name} (ID: ${directAccount.id})`);

      // 查询该账户的I04工时记录
      const records = await prisma.calcResult.findMany({
        where: {
          calcDate,
          attendanceCodeId: attendanceCode.id,
          accountId: directAccount.id,
        },
      });

      const totalHours = records.reduce((sum, r) => sum + r.actualHours, 0);
      console.log(`  I04工时记录数: ${records.length}`);
      console.log(`  I04总工时: ${totalHours}`);

      if (totalHours > 0) {
        console.log(`  ✓ 有直接工时数据`);
      } else {
        console.log(`  ✗ 没有直接工时数据`);
      }
    } else {
      console.log(`  ✗ 未找到直接设备账户`);
    }

    console.log();
  }

  console.log('========================================\n');
}

checkDirectHoursByLine()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
