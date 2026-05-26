import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 删除 CalcResult 表中 ATTENDANCE_HOURS 类型的数据 ===\n');

  // 1. 查询 ATTENDANCE_HOURS 类型的出勤代码
  console.log('1. 查询 ATTENDANCE_HOURS 类型的出勤代码:');
  const attendanceHourCodes = await prisma.calculationAttendanceCode.findMany({
    where: { type: 'ATTENDANCE_HOURS' },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  });

  console.log(`  找到 ${attendanceHourCodes.length} 个出勤代码:`);
  attendanceHourCodes.forEach((code) => {
    console.log(`    - ID: ${code.id}, 代码: ${code.code}, 名称: ${code.name}`);
  });

  if (attendanceHourCodes.length === 0) {
    console.log('\n没有找到 ATTENDANCE_HOURS 类型的出勤代码');
    return;
  }

  const attendanceHourCodeIds = attendanceHourCodes.map((c) => c.id);
  console.log(`\n出勤代码ID列表: ${attendanceHourCodeIds.join(', ')}`);

  // 2. 查询符合条件的 CalcResult 记录数
  console.log('\n2. 查询符合条件的 CalcResult 记录:');
  const countBefore = await prisma.calcResult.count({
    where: {
      calculationAttendanceCodeId: {
        in: attendanceHourCodeIds,
      },
    },
  });

  console.log(`  找到 ${countBefore} 条 CalcResult 记录`);

  if (countBefore === 0) {
    console.log('\n✓ 没有需要删除的记录');
    return;
  }

  // 3. 显示部分样例数据
  console.log('\n3. 显示前5条样例数据:');
  const samples = await prisma.calcResult.findMany({
    where: {
      calculationAttendanceCodeId: {
        in: attendanceHourCodeIds,
      },
    },
    include: {
      calculationAttendanceCode: {
        select: {
          code: true,
          name: true,
          type: true,
        },
      },
    },
    take: 5,
    orderBy: {
      calcDate: 'desc',
    },
  });

  samples.forEach((sample, idx) => {
    const date = sample.calcDate.toISOString().split('T')[0];
    console.log(`  记录${idx + 1}:`);
    console.log(`    员工: ${sample.employeeNo}`);
    console.log(`    日期: ${date}`);
    console.log(`    出勤代码: ${sample.calculationAttendanceCode?.name} (${sample.calculationAttendanceCode?.code})`);
    console.log(`    时长: ${sample.actualHours}h`);
    console.log('');
  });

  // 4. 执行删除
  console.log('4. 执行删除操作...');
  const deleteResult = await prisma.calcResult.deleteMany({
    where: {
      calculationAttendanceCodeId: {
        in: attendanceHourCodeIds,
      },
    },
  });

  console.log(`✓ 删除了 ${deleteResult.count} 条记录`);

  // 5. 验证删除结果
  console.log('\n5. 验证删除结果:');
  const countAfter = await prisma.calcResult.count({
    where: {
      calculationAttendanceCodeId: {
        in: attendanceHourCodeIds,
      },
    },
  });

  console.log(`  剩余记录数: ${countAfter}`);

  if (countAfter === 0) {
    console.log('\n✅ 所有 ATTENDANCE_HOURS 类型的 CalcResult 数据已成功删除！');
  } else {
    console.log('\n⚠️  仍有数据残留，请检查');
  }
}

main()
  .then(() => console.log('\n完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
