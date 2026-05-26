import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CalcResult 表说明 ===\n');

  console.log('1. 表名：CalcResult（工时计算结果表）');
  console.log('   对应前端接口：/calculate/results');
  console.log('   前端页签：精益工时结果\n');

  console.log('2. 存储的数据类型：');
  console.log('   - 精益工时结果（LEAN_HOURS）：线体工时、车间工时、工序工时等');
  console.log('   - 考勤工时结果（ATTENDANCE_HOURS）：出勤工时等');
  console.log('   - 通过 calculationAttendanceCodeId 关联计算出勤代码表\n');

  console.log('3. 主要字段：');
  const result = await prisma.calcResult.findFirst({
    include: {
      calculationAttendanceCode: true,
    },
  });

  if (result) {
    console.log('   示例数据：');
    console.log(`   - ID: ${result.id}`);
    console.log(`   - 员工号: ${result.employeeNo}`);
    console.log(`   - 计算日期: ${result.calcDate.toISOString().split('T')[0]}`);
    console.log(`   - 班次ID: ${result.shiftId} (null表示未排班/精益打卡)`);
    console.log(`   - 班次名称: ${result.shiftName}`);
    console.log(`   - 出勤代码ID: ${result.calculationAttendanceCodeId}`);
    console.log(`   - 上班打卡: ${result.punchInTime}`);
    console.log(`   - 下班打卡: ${result.punchOutTime}`);
    console.log(`   - 标准工时: ${result.standardHours}小时`);
    console.log(`   - 实际工时: ${result.actualHours}小时`);
    console.log(`   - 加班工时: ${result.overtimeHours}小时`);
    if (result.calculationAttendanceCode) {
      console.log(`   - 出勤代码: ${result.calculationAttendanceCode.name} (${result.calculationAttendanceCode.type})`);
    }
  }

  console.log('\n4. CalculationAttendanceCode（计算出勤代码表）说明：');
  const codes = await prisma.calculationAttendanceCode.findMany({
    orderBy: { id: 'asc' },
  });

  console.log(`   总数: ${codes.length}个出勤代码\n`);
  console.log('   出勤代码列表：');
  codes.forEach(code => {
    console.log(`   - ${code.name} (${code.type})`);
    console.log(`     代码: ${code.code}, 优先级: ${code.priority}`);
    console.log(`     扣用餐: ${code.deductMeal}, 计算班外: ${code.includeOutside}, 只计算班外: ${code.onlyOutside}`);
  });

  console.log('\n5. 数据关系：');
  console.log('   CalcResult.calculationAttendanceCodeId → CalculationAttendanceCode.id');
  console.log('   CalcResult.shiftId → Shift.id (可为null，表示未排班/精益打卡)');
  console.log('   CalcResult.employeeNo → Employee.employeeNo');

  console.log('\n6. 前端页签对应关系：');
  console.log('   - 精益工时结果 → /calculate/results → 过滤 type=LEAN_HOURS');
  console.log('   - 考勤工时结果 → /calculate/work-hour-results → 另一张表');

  console.log('\n7. 当前数据统计：');
  const leanCount = await prisma.calcResult.count({
    where: {
      calculationAttendanceCode: {
        type: 'LEAN_HOURS',
      },
    },
  });

  const attendanceCount = await prisma.calcResult.count({
    where: {
      calculationAttendanceCode: {
        type: 'ATTENDANCE_HOURS',
      },
    },
  });

  const nullShiftCount = await prisma.calcResult.count({
    where: {
      shiftId: null,
    },
  });

  console.log(`   - LEAN_HOURS类型: ${leanCount}条`);
  console.log(`   - ATTENDANCE_HOURS类型: ${attendanceCount}条`);
  console.log(`   - shiftId为null(精益打卡): ${nullShiftCount}条`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
