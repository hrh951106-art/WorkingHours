import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkI01Records() {
  console.log('========================================');
  console.log('检查I01直接工时记录');
  console.log('========================================\n');

  const i01Code = await prisma.attendanceCode.findFirst({
    where: { code: 'I01' },
  });

  if (!i01Code) {
    console.log('✗ 未找到I01出勤代码');
    await prisma.$disconnect();
    return;
  }

  const startDate = new Date('2026-03-11');
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date('2026-03-11');
  endDate.setHours(23, 59, 59, 999);

  const i01Records = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
      attendanceCodeId: i01Code.id,
    },
    select: {
      id: true,
      accountName: true,
      employeeNo: true,
      actualHours: true,
    },
  });

  console.log(`I01直接工时记录数: ${i01Records.length}\n`);

  if (i01Records.length > 0) {
    console.log('I01工时记录详情:\n');

    for (const record of i01Records) {
      console.log(`账户: ${record.accountName}`);
      console.log(`  员工: ${record.employeeNo}, 工时: ${record.actualHours}`);

      // 检查账户是否包含"产线"
      if (record.accountName.includes('产线') && record.accountName.includes('直接设备')) {
        // 从账户名称中提取产线名称
        const match = record.accountName.match(/\/([^/]+产线)\/{5}直接设备/);
        if (match) {
          const lineName = match[1];
          console.log(`  ✓ 这是产线直接设备记录: ${lineName}`);
        }
      }
      console.log();
    }

    // 按账户分组统计
    console.log('按账户分组统计:\n');

    const accountGroups: Record<string, number> = {};
    for (const record of i01Records) {
      if (!accountGroups[record.accountName]) {
        accountGroups[record.accountName] = 0;
      }
      accountGroups[record.accountName] += record.actualHours;
    }

    for (const [accountName, totalHours] of Object.entries(accountGroups)) {
      console.log(`${accountName}: ${totalHours.toFixed(2)}小时`);
    }

  } else {
    console.log('✗ 没有I01直接工时记录');
    console.log('\n这就是为什么L01无法分摊的原因！');
    console.log('\nL01分摊规则需要：');
    console.log('1. I04车间工时记录（源数据）✓ 有2条');
    console.log('2. I01产线直接工时记录（用于计算分摊系数）✗ 没有记录');
    console.log('\n解决方案：');
    console.log('- 需要为产线创建I01直接工时记录');
    console.log('- 或者修改L01配置，使用其他有工时记录的出勤代码作为直接工时代码');
  }

  // 检查其他出勤代码
  console.log('\n========================================');
  console.log('检查其他出勤代码的工时记录');
  console.log('========================================\n');

  const otherCodes = ['I02', 'I03', 'I06'];

  for (const code of otherCodes) {
    const attendanceCode = await prisma.attendanceCode.findFirst({
      where: { code: code },
    });

    if (attendanceCode) {
      const records = await prisma.calcResult.findMany({
        where: {
          calcDate: {
            gte: startDate,
            lte: endDate,
          },
          attendanceCodeId: attendanceCode.id,
          accountName: {
            contains: 'W1总装车间',
          },
        },
        take: 5,
      });

      console.log(`${code} (${attendanceCode.name}): ${records.length} 条记录 (W1车间)`);
    }
  }

  console.log('\n========================================\n');
}

checkI01Records()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
