import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIndirectCalcResultDetails() {
  console.log('========================================');
  console.log('检查间接设备CalcResult的详细信息');
  console.log('========================================\n');

  // 1. 查询所有间接设备CalcResult
  const indirectCalcResults = await prisma.calcResult.findMany({
    where: {
      accountName: {
        endsWith: '间接设备',
      },
    },
    include: {
      employee: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`间接设备CalcResult记录数: ${indirectCalcResults.length}\n`);

  for (const record of indirectCalcResults) {
    // 查询出勤代码
    const attendanceCode = await prisma.attendanceCode.findUnique({
      where: { id: record.attendanceCodeId || 0 },
    });

    console.log(`账户: ${record.accountName}`);
    console.log(`  员工: ${record.employee.name} (${record.employeeNo})`);
    console.log(`  工时: ${record.actualHours}`);
    console.log(`  日期: ${record.calcDate.toISOString().split('T')[0]}`);
    console.log(`  出勤代码: ${attendanceCode?.code || 'NULL'} (${attendanceCode?.name || 'Unknown'})`);
    console.log(`  出勤代码ID: ${record.attendanceCodeId}`);
    console.log(`  创建时间: ${record.createdAt.toISOString()}`);
    console.log();
  }

  // 2. 检查I04出勤代码的工时记录
  console.log('========================================');
  console.log('检查I04出勤代码的工时记录');
  console.log('========================================\n');

  const i04Code = await prisma.attendanceCode.findFirst({
    where: {
      code: 'I04',
    },
  });

  if (i04Code) {
    console.log(`I04出勤代码ID: ${i04Code.id}\n`);

    const i04Records = await prisma.calcResult.findMany({
      where: {
        attendanceCodeId: i04Code.id,
      },
      orderBy: {
        calcDate: 'desc',
      },
      take: 20,
    });

    console.log(`I04工时记录数: ${i04Records.length}\n`);

    if (i04Records.length > 0) {
      console.log('I04工时记录详情:\n');

      // 按账户分组
      const accountGroups: Record<string, any[]> = {};
      for (const record of i04Records) {
        if (!accountGroups[record.accountName]) {
          accountGroups[record.accountName] = [];
        }
        accountGroups[record.accountName].push(record);
      }

      for (const [accountName, records] of Object.entries(accountGroups)) {
        const totalHours = records.reduce((sum, r) => sum + (r.actualHours || 0), 0);
        console.log(`账户: ${accountName}`);
        console.log(`  记录数: ${records.length}, 总工时: ${totalHours.toFixed(2)}`);

        // 检查账户是否包含"间接设备"
        if (accountName.includes('间接设备')) {
          console.log(`  ⚠ 这是间接设备账户！`);
        }

        console.log();
      }
    } else {
      console.log('✗ 没有I04工时记录');
    }
  }

  // 3. 分析问题
  console.log('========================================');
  console.log('问题分析');
  console.log('========================================\n');

  if (indirectCalcResults.length > 0) {
    const sampleRecord = indirectCalcResults[0];
    const attendanceCode = await prisma.attendanceCode.findUnique({
      where: { id: sampleRecord.attendanceCodeId || 0 },
    });

    console.log('间接设备CalcResult使用的出勤代码:', attendanceCode?.code || 'NULL');
    console.log('L01配置的出勤代码: I04');

    if (attendanceCode?.code === 'I04') {
      console.log('\n✓ 间接设备CalcResult使用的是I04出勤代码');
      console.log('  但这些记录没有对应的AllocationResult');
      console.log('  可能的原因：');
      console.log('  1. AllocationResult被清理逻辑删除了');
      console.log('  2. 创建AllocationResult时出错了');
    } else {
      console.log('\n✗ 间接设备CalcResult使用的不是I04出勤代码');
      console.log('  这些记录不是通过L01分摊创建的');
      console.log('  可能是通过其他方式创建的（如手动创建、其他分摊规则等）');
    }
  }

  console.log('\n========================================\n');
}

checkIndirectCalcResultDetails()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
