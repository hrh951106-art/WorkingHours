import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteEmployees() {
  const employeeNos = [
    '202605007',
    '202605008',
    '202605009',
    '202605010',
    '202605011',
    '202605012',
    '202605013',
    '202605014',
    '202605015',
  ];

  console.log('开始删除员工及其相关数据...');
  console.log('员工工号列表:', employeeNos);

  try {
    // 1. 获取要删除的员工ID
    const employees = await prisma.employee.findMany({
      where: {
        employeeNo: { in: employeeNos },
      },
      select: {
        id: true,
        employeeNo: true,
        name: true,
      },
    });

    if (employees.length === 0) {
      console.log('未找到要删除的员工');
      return;
    }

    const employeeIds = employees.map((e) => e.id);
    console.log('找到的员工:', employees);

    // 2. 删除相关的劳动力账户
    console.log('\n1. 删除 EmployeeLaborAccount...');
    const laborAccountResult = await prisma.employeeLaborAccount.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${laborAccountResult.count} 条劳动力账户记录`);

    // 3. 删除相关的金额系数
    console.log('\n2. 删除 EmployeeCoefficient...');
    const coefficientResult = await prisma.employeeCoefficient.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${coefficientResult.count} 条金额系数记录`);

    // 4. 删除相关的工作信息历史
    console.log('\n3. 删除 WorkInfoHistory...');
    const workInfoResult = await prisma.workInfoHistory.deleteMany({
      where: {
        employeeId: { in: employeeIds },
      },
    });
    console.log(`   已删除 ${workInfoResult.count} 条工作信息历史记录`);

    // 5. 删除相关的考勤规则组关联
    console.log('\n4. 删除 EmployeeAttendanceRuleGroup...');
    const ruleGroupResult = await prisma.employeeAttendanceRuleGroup.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${ruleGroupResult.count} 条考勤规则组关联记录`);

    // 6. 删除员工教育经历
    console.log('\n5. 删除 EmployeeEducation...');
    const educationResult = await prisma.employeeEducation.deleteMany({
      where: {
        employeeId: { in: employeeIds },
      },
    });
    console.log(`   已删除 ${educationResult.count} 条教育经历记录`);

    // 7. 删除员工家庭成员
    console.log('\n6. 删除 EmployeeFamilyMember...');
    const familyResult = await prisma.employeeFamilyMember.deleteMany({
      where: {
        employeeId: { in: employeeIds },
      },
    });
    console.log(`   已删除 ${familyResult.count} 条家庭成员记录`);

    // 8. 删除员工工作经历
    console.log('\n7. 删除 EmployeeWorkExperience...');
    const workExpResult = await prisma.employeeWorkExperience.deleteMany({
      where: {
        employeeId: { in: employeeIds },
      },
    });
    console.log(`   已删除 ${workExpResult.count} 条工作经历记录`);

    // 9. 检查并删除相关的打卡记录
    console.log('\n8. 检查 PunchRecord...');
    const punchRecordResult = await prisma.punchRecord.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${punchRecordResult.count} 条打卡记录`);

    // 10. 检查并删除相关的考勤计算结果
    console.log('\n9. 检查 CalcResult...');
    const calcResult = await prisma.calcResult.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${calcResult.count} 条考勤计算结果`);

    // 11. 检查并删除相关的工时结果
    console.log('\n10. 检查 WorkHourResult...');
    const workHourResult = await prisma.workHourResult.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${workHourResult.count} 条工时结果`);

    // 12. 检查并删除相关的打卡对
    console.log('\n11. 检查 PunchPair...');
    const punchPairResult = await prisma.punchPair.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${punchPairResult.count} 条打卡对记录`);

    // 13. 检查并删除相关的考勤打卡对
    console.log('\n12. 检查 AttendancePunchPair...');
    const attendancePunchPairResult = await prisma.attendancePunchPair.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${attendancePunchPairResult.count} 条考勤打卡对记录`);

    // 14. 检查并删除相关的员工变更日志
    console.log('\n13. 检查 EmployeeChangeLog...');
    const changeLogResult = await prisma.employeeChangeLog.deleteMany({
      where: {
        employeeId: { in: employeeIds },
      },
    });
    console.log(`   已删除 ${changeLogResult.count} 条员工变更日志`);

    // 15. 最后删除员工主记录
    console.log('\n14. 删除 Employee 主记录...');
    const employeeResult = await prisma.employee.deleteMany({
      where: {
        employeeNo: { in: employeeNos },
      },
    });
    console.log(`   已删除 ${employeeResult.count} 条员工记录`);

    console.log('\n✅ 删除完成！');
    console.log(`总计删除了 ${employeeResult.count} 名员工及其所有相关数据`);
  } catch (error) {
    console.error('❌ 删除过程中出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteEmployees()
  .then(() => {
    console.log('\n脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });
