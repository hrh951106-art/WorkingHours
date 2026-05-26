import { PrismaClient } from '@prisma/client';
import { AttendanceWorkHourService } from './src/modules/calculate/attendance-work-hour.service';
import { AttendanceRuleGroupHelper } from './src/modules/attendance-rule-group/attendance-rule-group-helper.service';
import { PrismaService } from './src/database/prisma.service';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const attendanceRuleGroupHelper = new AttendanceRuleGroupHelper(prismaService);
const attendanceWorkHourService = new AttendanceWorkHourService(
  prismaService,
  attendanceRuleGroupHelper,
);

async function test() {
  try {
    console.log('=== 测试考勤工时计算优化 ===\n');

    // Step 1: 检查 ATTENDANCE_HOURS 出勤代码是否存在
    console.log('Step 1: 检查 ATTENDANCE_HOURS 出勤代码');
    const attendanceHoursCode = await prisma.calculationAttendanceCode.findFirst({
      where: {
        type: 'ATTENDANCE_HOURS',
        code: 'AC_001',
      },
    });

    if (!attendanceHoursCode) {
      console.error('❌ 未找到 ATTENDANCE_HOURS 出勤代码（AC_001）');
      return;
    }
    console.log(`✅ 找到 ATTENDANCE_HOURS 出勤代码: ID=${attendanceHoursCode.id}, code=${attendanceHoursCode.code}, name=${attendanceHoursCode.name}\n`);

    // Step 2: 检查是否有考勤打卡收卡数据
    console.log('Step 2: 检查考勤打卡收卡数据');
    const attendancePunchPairs = await prisma.attendancePunchPair.findMany({
      where: {
        employeeNo: '202604003',
      },
      orderBy: {
        punchDate: 'desc',
      },
      take: 5,
    });

    if (attendancePunchPairs.length === 0) {
      console.warn('⚠️  未找到考勤打卡收卡数据，请先执行考勤打卡收卡');
      return;
    }
    console.log(`✅ 找到 ${attendancePunchPairs.length} 条考勤打卡收卡记录`);

    const testPunchDate = attendancePunchPairs[0].punchDate;
    console.log(`使用测试日期: ${testPunchDate.toISOString().substring(0, 10)}\n`);

    // Step 3: 计算考勤工时
    console.log('Step 3: 计算考勤工时');
    const calcResult = await attendanceWorkHourService.calculateDaily(
      '202604003',
      testPunchDate,
      `test-${Date.now()}`,
    );

    if (!calcResult.success) {
      console.error(`❌ 计算考勤工时失败: ${calcResult.message}`);
      return;
    }
    console.log(`✅ 计算成功，生成 ${calcResult.results.length} 条工时记录\n`);

    // Step 4: 检查 CalcResult 表中的数据
    console.log('Step 4: 检查 CalcResult 表中的数据');
    const calcResults = await prisma.calcResult.findMany({
      where: {
        employeeNo: '202604003',
        calcDate: testPunchDate,
        calculationAttendanceCodeId: attendanceHoursCode.id,
      },
      include: {
        calculationAttendanceCode: true,
      },
    });

    console.log(`✅ CalcResult 表中有 ${calcResults.length} 条记录`);
    if (calcResults.length > 0) {
      calcResults.forEach((result, index) => {
        const punchIn = result.punchInTime
          ? result.punchInTime.toISOString().substring(11, 19)
          : '无';
        const punchOut = result.punchOutTime
          ? result.punchOutTime.toISOString().substring(11, 19)
          : '无';
        console.log(`  记录 ${index + 1}: 日期=${result.calcDate.toISOString().substring(0, 10)}, ` +
          `上班=${punchIn}, 下班=${punchOut}, 工时=${result.actualHours}小时, ` +
          `出勤代码=${result.calculationAttendanceCode?.code}`);
      });
    }
    console.log();

    // Step 5: 测试同步功能
    console.log('Step 5: 测试同步功能（CalcResult -> WorkHourResult）');
    const syncResult = await attendanceWorkHourService.syncToWorkHourResult(
      ['202604003'],
      testPunchDate,
      testPunchDate,
    );

    if (!syncResult.success) {
      console.error(`❌ 同步失败: ${syncResult.message}`);
      return;
    }
    console.log(`✅ 同步成功: ${syncResult.message}\n`);

    // Step 6: 检查 WorkHourResult 表中的数据
    console.log('Step 6: 检查 WorkHourResult 表中的数据');
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        employeeNo: '202604003',
        calcDate: testPunchDate,
        sourceType: 'CALCULATED',
      },
    });

    console.log(`✅ WorkHourResult 表中有 ${workHourResults.length} 条记录`);
    if (workHourResults.length > 0) {
      workHourResults.forEach((result, index) => {
        const startTime = result.startTime
          ? result.startTime.toISOString().substring(11, 19)
          : '无';
        const endTime = result.endTime
          ? result.endTime.toISOString().substring(11, 19)
          : '无';
        console.log(`  记录 ${index + 1}: 日期=${result.calcDate.toISOString().substring(0, 10)}, ` +
          `上班=${startTime}, 下班=${endTime}, 工时=${result.workHours}小时, ` +
          `出勤代码=${result.calcAttendanceCode}, 来源=${result.sourceType}`);
      });
    }
    console.log();

    // Step 7: 测试查询接口
    console.log('Step 7: 测试查询接口（从 CalcResult 获取数据）');
    const queryResult = await attendanceWorkHourService.getWorkHourResults({
      employeeNo: '202604003',
      startDate: testPunchDate.toISOString().substring(0, 10),
      endDate: testPunchDate.toISOString().substring(0, 10),
      page: 1,
      pageSize: 20,
    }, {});

    console.log(`✅ 查询成功，共 ${queryResult.total} 条记录`);
    if (queryResult.items.length > 0) {
      queryResult.items.forEach((item: any, index: number) => {
        const startTime = item.startTime
          ? item.startTime.toISOString().substring(11, 19)
          : '无';
        const endTime = item.endTime
          ? item.endTime.toISOString().substring(11, 19)
          : '无';
        console.log(`  记录 ${index + 1}: 日期=${item.calcDate.toISOString().substring(0, 10)}, ` +
          `上班=${startTime}, 下班=${endTime}, 工时=${item.workHours}小时, ` +
          `出勤代码=${item.calcAttendanceCode}, 状态=${item.status}`);
      });
    }
    console.log();

    console.log('=== 测试完成，所有功能正常 ===');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
