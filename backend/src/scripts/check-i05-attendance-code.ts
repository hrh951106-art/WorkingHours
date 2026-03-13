import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkI05AttendanceCode() {
  console.log('========================================');
  console.log('检查出勤代码 I05');
  console.log('========================================\n');

  // 1. 查询出勤代码 I05 的信息
  console.log('第一步：查询出勤代码 I05 的信息\n');

  const attendanceCodeI05 = await prisma.attendanceCode.findFirst({
    where: {
      code: 'I05',
    },
  });

  if (!attendanceCodeI05) {
    console.log('✗ 未找到出勤代码 I05');
    console.log('   这可能是导致G02规则找不到工时记录的原因！');
  } else {
    console.log(`出勤代码ID: ${attendanceCodeI05.id}`);
    console.log(`出勤代码: ${attendanceCodeI05.code}`);
    console.log(`出勤代码名称: ${attendanceCodeI05.name}`);
    console.log(`类型: ${attendanceCodeI05.type}`);
    console.log(`状态: ${attendanceCodeI05.status}\n`);
  }

  // 2. 查询所有出勤代码
  console.log('系统中所有出勤代码:\n');

  const allAttendanceCodes = await prisma.attendanceCode.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      code: 'asc',
    },
  });

  console.log(`找到 ${allAttendanceCodes.length} 个出勤代码:\n`);

  for (const code of allAttendanceCodes) {
    console.log(`  ID: ${code.id}, 代码: ${code.code}, 名称: ${code.name}`);
  }

  // 3. 查询指定日期范围内 I05 出勤代码的工时记录数量
  console.log('\n第二步：查询指定日期范围内 I05 出勤代码的工时记录\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  if (attendanceCodeI05) {
    const i05RecordCount = await prisma.calcResult.count({
      where: {
        calcDate: {
          gte: startDate,
          lte: endDate,
        },
        attendanceCodeId: attendanceCodeI05.id,
      },
    });

    console.log(`出勤代码 I05 (ID: ${attendanceCodeI05.id}) 在指定日期范围内的工时记录数: ${i05RecordCount}\n`);

    if (i05RecordCount === 0) {
      console.log('✗ 该日期范围内没有出勤代码 I05 的工时记录');
      console.log('   这是导致G02规则找不到待分摊工时记录的原因！\n');
    } else {
      console.log(`✓ 找到 ${i05RecordCount} 条工时记录\n`);

      // 显示这些记录的详情
      const i05Records = await prisma.calcResult.findMany({
        where: {
          calcDate: {
            gte: startDate,
            lte: endDate,
          },
          attendanceCodeId: attendanceCodeI05.id,
        },
        include: {
          employee: true,
        },
        take: 10,
      });

      console.log('前10条记录:');
      for (const record of i05Records) {
        console.log(`  ${record.calcDate.toISOString().split('T')[0]} - ${record.employee?.name || 'Unknown'} - ${record.accountName} - ${record.actualHours}小时`);
      }
    }
  }

  // 4. 总结
  console.log('\n========================================');
  console.log('问题诊断总结');
  console.log('========================================\n');

  if (!attendanceCodeI05) {
    console.log('问题：系统中不存在出勤代码 I05');
    console.log('\n解决方案：');
    console.log('1. 检查G02规则的分摊源配置，确认出勤代码是否正确');
    console.log('2. 如果应该使用其他出勤代码（如正常出勤代码），请修改配置');
  } else {
    const i05RecordCount = await prisma.calcResult.count({
      where: {
        calcDate: {
          gte: startDate,
          lte: endDate,
        },
        attendanceCodeId: attendanceCodeI05.id,
      },
    });

    if (i05RecordCount === 0) {
      console.log('问题：G02规则配置的出勤代码是 I05，但该日期范围内没有 I05 的工时记录');
      console.log('\n解决方案：');
      console.log('1. 修改G02规则的出勤代码配置，使用实际存在的出勤代码（如正常出勤代码）');
      console.log('2. 或者先录入 I05 出勤代码的工时记录');
      console.log('3. 或者调整日期范围到包含 I05 工时记录的日期');
    } else {
      console.log('问题：G02规则应该能找到工时记录，但实际提示未找到');
      console.log('\n可能的其他原因：');
      console.log('1. 账户筛选条件过于严格（设备类型=A02间接设备）');
      console.log('2. 员工筛选条件不匹配');
      console.log('3. 分摊归属层级配置不正确');
    }
  }

  console.log('\n========================================\n');
}

checkI05AttendanceCode()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
