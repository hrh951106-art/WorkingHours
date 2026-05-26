import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('=== 创建测试数据 ===\n');

    // 1. 创建精益��时结果
    const leanResult = await prisma.calcResult.create({
      data: {
        employeeNo: '202604003',
        calcDate: new Date('2026-05-14'),
        shiftId: 1,
        shiftName: '正常班',
        calculationAttendanceCodeId: 1, // 精益工时类型
        punchInTime: new Date('2026-05-14T08:00:00'),
        punchOutTime: new Date('2026-05-14T17:00:00'),
        standardHours: 8,
        actualHours: 8,
        overtimeHours: 0,
        leaveHours: 0,
        absenceHours: 0,
        accountHours: '[]',
        exceptions: '[]',
        status: 'PENDING',
        accountId: 1,
        accountName: '产线1',
      },
    });

    console.log('✅ 创建精益工时结果成功:', leanResult.id);

    // 2. 创建考勤工时结果
    const attendanceResult = await prisma.calcResult.create({
      data: {
        employeeNo: '202604003',
        calcDate: new Date('2026-05-14'),
        shiftId: 1,
        shiftName: '正常班',
        calculationAttendanceCodeId: 7, // 考勤工时类型
        punchInTime: new Date('2026-05-14T08:00:00'),
        punchOutTime: new Date('2026-05-14T17:00:00'),
        standardHours: 8,
        actualHours: 8,
        overtimeHours: 0,
        leaveHours: 0,
        absenceHours: 0,
        accountHours: '[]',
        exceptions: '[]',
        status: 'PENDING',
        accountId: 1,
        accountName: '产线1',
      },
    });

    console.log('✅ 创建考勤工时结果成功:', attendanceResult.id);

    // 3. 查询验证
    console.log('\n=== 验证数据 ===');

    const leanResults = await prisma.calcResult.findMany({
      where: {
        calculationAttendanceCodeId: 1,
      },
      include: {
        calculationAttendanceCode: true,
        employee: true,
      },
    });

    console.log(`\n精益工时结果数量: ${leanResults.length}`);
    if (leanResults.length > 0) {
      const item = leanResults[0];
      console.log('示例数据:');
      console.log(`  员工: ${item.employee?.name} (${item.employeeNo})`);
      console.log(`  日期: ${item.calcDate.toISOString().substring(0, 10)}`);
      console.log(`  出勤代码: ${item.calculationAttendanceCode?.name}`);
      console.log(`  上班: ${item.punchInTime?.toISOString().substring(11, 19)}`);
      console.log(`  下班: ${item.punchOutTime?.toISOString().substring(11, 19)}`);
      console.log(`  实际工时: ${item.actualHours}小时`);
      console.log(`  账户: ${item.accountName}`);
    }

    const attendanceResults = await prisma.calcResult.findMany({
      where: {
        calculationAttendanceCodeId: 7,
      },
      include: {
        calculationAttendanceCode: true,
        employee: true,
      },
    });

    console.log(`\n考勤工时结果数量: ${attendanceResults.length}`);
    if (attendanceResults.length > 0) {
      const item = attendanceResults[0];
      console.log('示例数据:');
      console.log(`  员工: ${item.employee?.name} (${item.employeeNo})`);
      console.log(`  日期: ${item.calcDate.toISOString().substring(0, 10)}`);
      console.log(`  出勤代码: ${item.calculationAttendanceCode?.name}`);
      console.log(`  上班: ${item.punchInTime?.toISOString().substring(11, 19)}`);
      console.log(`  下班: ${item.punchOutTime?.toISOString().substring(11, 19)}`);
      console.log(`  实际工时: ${item.actualHours}小时`);
      console.log(`  账户: ${item.accountName}`);
    }

    console.log('\n=== 完成 ===');

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
