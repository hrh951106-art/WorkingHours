import { PrismaClient } from '@prisma/client';
import { AttendanceWorkHourService } from './src/modules/calculate/attendance-work-hour.service';
import { CalculateEngine } from './src/modules/calculate/calculate.engine';
import { CalculateService } from './src/modules/calculate/calculate.service';
import { AttendanceCodeService } from './src/modules/calculate/attendance-code.service';
import { AttendanceRuleGroupHelper } from './src/modules/attendance-rule-group/attendance-rule-group-helper.service';
import { DataScopeService } from './src/modules/common/filters/data-scope.filter';
import { PrismaService } from './src/database/prisma.service';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const attendanceRuleGroupHelper = new AttendanceRuleGroupHelper(prismaService);
const attendanceWorkHourService = new AttendanceWorkHourService(
  prismaService,
  attendanceRuleGroupHelper,
);
const calculateEngine = new CalculateEngine(prismaService);
const attendanceCodeService = new AttendanceCodeService(prismaService);
const dataScopeService = new DataScopeService(prismaService);
const calculateService = new CalculateService(
  prismaService,
  calculateEngine,
  attendanceCodeService,
  dataScopeService,
);

async function test() {
  try {
    console.log('=== 对比精益工时和考勤工时结果的列结构 ===\n');

    // 1. 先创建一些测试数据
    console.log('Step 1: 创建测试数据');

    // 创建精益工时结果
    await prisma.calcResult.create({
      data: {
        employeeNo: 'TEST001',
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
      },
    });

    // 创建考勤工时结果
    await prisma.calcResult.create({
      data: {
        employeeNo: 'TEST002',
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
      },
    });

    console.log('✅ 创建测试数据成功\n');

    // 2. 查询精益工时结果
    console.log('Step 2: 查询精益工时结果');
    const leanResults = await calculateService.getResults({
      page: 1,
      pageSize: 10,
    });

    console.log(`精益工时结果数量: ${leanResults.total}`);
    if (leanResults.items.length > 0) {
      console.log('精益工时结果字段:');
      const fields = Object.keys(leanResults.items[0]);
      fields.forEach(field => {
        console.log(`  - ${field}`);
      });
    }
    console.log();

    // 3. 查询考勤工时结果
    console.log('Step 3: 查询考勤工时结果');
    const attendanceResults = await attendanceWorkHourService.getWorkHourResults({
      page: 1,
      pageSize: 10,
    }, {});

    console.log(`考勤工时结果数量: ${attendanceResults.total}`);
    if (attendanceResults.items.length > 0) {
      console.log('考勤工时结果字段:');
      const fields = Object.keys(attendanceResults.items[0]);
      fields.forEach(field => {
        console.log(`  - ${field}`);
      });
    }
    console.log();

    // 4. 对比字段是否一致
    console.log('Step 4: 对比字段');
    if (leanResults.items.length > 0 && attendanceResults.items.length > 0) {
      const leanFields = Object.keys(leanResults.items[0]);
      const attendanceFields = Object.keys(attendanceResults.items[0]);

      const missing = leanFields.filter(f => !attendanceFields.includes(f));
      const extra = attendanceFields.filter(f => !leanFields.includes(f));

      if (missing.length === 0 && extra.length === 0) {
        console.log('✅ 字段完全一致！');
      } else {
        if (missing.length > 0) {
          console.log('⚠️  考勤工时结果缺少字段:', missing.join(', '));
        }
        if (extra.length > 0) {
          console.log('⚠️  考勤工时结果多余字段:', extra.join(', '));
        }
      }
    }

    // 5. 显示数据示例
    console.log('\nStep 5: 数据示例');
    if (leanResults.items.length > 0) {
      console.log('精益工时结果示例:');
      const item = leanResults.items[0];
      console.log(`  员工编号: ${item.employeeNo}`);
      console.log(`  计算日期: ${item.calcDate}`);
      console.log(`  出勤代码: ${item.calculationAttendanceCode?.code} - ${item.calculationAttendanceCode?.name}`);
      console.log(`  上班时间: ${item.punchInTime}`);
      console.log(`  下班时间: ${item.punchOutTime}`);
      console.log(`  实际工时: ${item.actualHours}小时`);
    }

    if (attendanceResults.items.length > 0) {
      console.log('\n考勤工时结果示例:');
      const item = attendanceResults.items[0];
      console.log(`  员工编号: ${item.employeeNo}`);
      console.log(`  计算日期: ${item.calcDate}`);
      console.log(`  出勤代码: ${item.calculationAttendanceCode?.code} - ${item.calculationAttendanceCode?.name}`);
      console.log(`  上班时间: ${item.punchInTime}`);
      console.log(`  下班时间: ${item.punchOutTime}`);
      console.log(`  实际工时: ${item.actualHours}小时`);
    }

    console.log('\n=== 测试完成 ===');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 清理测试数据
    await prisma.calcResult.deleteMany({
      where: {
        employeeNo: { in: ['TEST001', 'TEST002'] },
      },
    });
    await prisma.$disconnect();
  }
}

test();
