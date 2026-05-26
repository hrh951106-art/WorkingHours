import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 诊断精益工时重算没有计算金额的问题
 */
async function diagnoseRecalculateIssue() {
  console.log('========== 诊断精益工时重算金额计算问题 ==========\n');

  try {
    const employeeNo = '202604003';
    const calcDate = new Date('2026-05-12');

    // 1. 检查 CalcResult 表中的金额
    console.log('1. 检查 CalcResult 表（计算结果）...');
    const calcResults = await prisma.calcResult.findMany({
      where: {
        employeeNo,
        calcDate,
      },
      include: {
        calculationAttendanceCode: true,
      },
    });

    console.log(`找到 ${calcResults.length} 条 CalcResult 记录:\n`);
    calcResults.forEach((cr) => {
      console.log(`  ID: ${cr.id}`);
      console.log(`  出勤代码: ${cr.calculationAttendanceCode?.name} (${cr.calculationAttendanceCode?.code})`);
      console.log(`  工时: ${cr.actualHours}`);
      console.log(`  金额: ${cr.amount || '未计算'}`);
      console.log(`  账户: ${cr.accountName || '未设置'}`);
      console.log(`  账户工时: ${cr.accountHours || '[]'}`);
      console.log('');
    });

    // 2. 检查 WorkHourResult 表中的金额
    console.log('\n2. 检查 WorkHourResult 表（工时结果）...');
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        employeeNo,
        calcDate,
      },
    });

    console.log(`找到 ${workHourResults.length} 条 WorkHourResult 记录:\n`);
    workHourResults.forEach((whr) => {
      console.log(`  ID: ${whr.id}`);
      console.log(`  来源: ${whr.source === 1 ? '精益工时' : '考勤工时'}`);
      console.log(`  出勤代码: ${whr.calcAttendanceCode}`);
      console.log(`  工时: ${whr.workHours}`);
      console.log(`  金额: ${whr.amount || '未计算'}`);
      console.log(`  账户: ${whr.accountName}`);
      console.log('');
    });

    // 3. 检查是否所有 CalcResult 都没有金额
    const calcResultsWithoutAmount = calcResults.filter(cr => !cr.amount || cr.amount === 0);
    console.log(`\n3. CalcResult 中没有金额的记录: ${calcResultsWithoutAmount.length}/${calcResults.length}`);

    if (calcResultsWithoutAmount.length > 0) {
      console.log('\n问题确认：CalcResult 中的金额字段为空或0！');
      console.log('\n问题原因：');
      console.log('  attendanceCodeService.calculateFromPunchPair 方法没有计算金额');
      console.log('  只有 CalculateEngine.calculateDaily 方法才会计算金额');
      console.log('\n影响范围：');
      console.log('  - 精益工时重算不会计算金额');
      console.log('  - WorkHourPushService 推送时也没有金额可以同步');
    }

    // 4. 检查计算出勤代码是否启用金额计算
    console.log('\n4. 检查计算出勤代码配置...');
    const calcCodes = await prisma.calculationAttendanceCode.findMany({
      where: {
        code: 'A02',
      },
    });

    calcCodes.forEach((code) => {
      console.log(`  ${code.name} (${code.code})`);
      console.log(`    类型: ${code.type}`);
      console.log(`    计算工时: ${code.calculateHours}`);
      console.log(`    计算金额: ${code.calculateAmount ? '✅ 是' : '❌ 否'}`);
    });

  } catch (error) {
    console.error('诊断失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseRecalculateIssue()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n诊断失败:', error);
    process.exit(1);
  });
