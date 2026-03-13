import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查工时记录和分摊配置 ===\n');

  // 1. 检查工时记录总数
  const totalCalcResults = await prisma.calcResult.count();
  console.log(`1. 工时记录总数: ${totalCalcResults}`);

  // 2. 检查指定日期范围的工时记录
  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setDate(endDate.getDate() + 1);

  const calcResultsInRange = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    include: {
      employee: true,
      attendanceCode: true,
    },
    take: 10,
  });

  console.log(`\n2. 2026-03-01 ~ 2026-03-12 日期范围内的工时记录数: ${calcResultsInRange.length}`);
  if (calcResultsInRange.length > 0) {
    console.log('   前5条记录:');
    calcResultsInRange.slice(0, 5).forEach((r, i) => {
      console.log(`   [${i + 1}] 日期: ${r.calcDate.toISOString().split('T')[0]}, 员工: ${r.employee.employeeNo} - ${r.employee.name}, 出勤代码: ${r.attendanceCode?.code || 'N/A'}, 工时: ${r.actualHours || 0}`);
    });
  }

  // 3. 按出勤代码统计
  const byAttendanceCode = await prisma.calcResult.groupBy({
    by: ['attendanceCodeId'],
    where: {
      calcDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    _count: true,
  });

  console.log('\n3. 按出勤代码统计:');
  for (const stat of byAttendanceCode) {
    const code = await prisma.attendanceCode.findUnique({
      where: { id: stat.attendanceCodeId },
    });
    console.log(`   - ${code?.code || 'N/A'} (${code?.name || 'N/A'}): ${stat._count} 条记录`);
  }

  // 4. 检查G02配置
  console.log('\n4. 分摊配置列表:');
  const configs = await prisma.allocationConfig.findMany({
    where: { deletedAt: null },
    include: {
      sourceConfig: true,
    },
  });

  for (const config of configs) {
    console.log(`   - ${config.configName} (${config.configCode})`);
    console.log(`     状态: ${config.status}, ID: ${config.id}`);
    if (config.sourceConfig) {
      console.log(`     分摊源配置:`);
      console.log(`       - 员工筛选: ${config.sourceConfig.employeeFilter || '无'}`);
      console.log(`       - 账户筛选: ${config.sourceConfig.accountFilter || '无'}`);
      console.log(`       - 出勤代码: ${config.sourceConfig.attendanceCodes || '无'}`);
    }
  }

  // 5. 检查出勤代码
  console.log('\n5. 系统中所有出勤代码:');
  const attendanceCodes = await prisma.attendanceCode.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { type: 'asc' },
  });

  attendanceCodes.forEach((code) => {
    console.log(`   - ${code.code} (${code.name}, 类型: ${code.type})`);
  });

  // 6. 检查通用配置
  console.log('\n6. 通用配置:');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  if (generalConfig) {
    console.log(`   - 直接工时代码: ${generalConfig.actualHoursAllocationCode || '未设置'}`);
    console.log(`   - 间接工时代码: ${generalConfig.indirectHoursAllocationCode || '未设置'}`);
  } else {
    console.log('   未配置');
  }
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
