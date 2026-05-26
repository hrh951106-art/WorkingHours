import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    console.log('=== 检查出勤代码配置 ===\n');

    // 1. 检查 DefinitionAttendanceCode 表
    console.log('1. DefinitionAttendanceCode 表中的 ATTENDANCE_HOURS 类型:');
    const definitionCodes = await prisma.definitionAttendanceCode.findMany({
      where: {
        type: 'ATTENDANCE_HOURS',
      },
    });
    console.log(`找到 ${definitionCodes.length} 条记录`);
    definitionCodes.forEach(code => {
      console.log(`  ID=${code.id}, code=${code.code}, name=${code.name}, status=${code.status}, calculateHours=${code.calculateHours}`);
    });
    console.log();

    // 2. 检查 CalculationAttendanceCode 表
    console.log('2. CalculationAttendanceCode 表中的 ATTENDANCE_HOURS 类型:');
    const calculationCodes = await prisma.calculationAttendanceCode.findMany({
      where: {
        type: 'ATTENDANCE_HOURS',
      },
    });
    console.log(`找到 ${calculationCodes.length} 条记录`);
    calculationCodes.forEach(code => {
      console.log(`  ID=${code.id}, code=${code.code}, name=${code.name}, status=${code.status}`);
    });
    console.log();

    // 3. 检查考勤规则组配置（通过中间表查询）
    console.log('3. 考勤规则组中的出勤��码配置:');
    const ruleGroupCodes = await prisma.attendanceRuleGroupDefinitionAttendanceCode.findMany();
    console.log(`找到 ${ruleGroupCodes.length} 条关联记录`);
    ruleGroupCodes.forEach(rel => {
      console.log(`  规则组ID=${rel.ruleGroupId}, 出勤代码ID=${rel.definitionAttendanceCodeId}`);
    });
    console.log();

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
