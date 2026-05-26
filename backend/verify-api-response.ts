import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('=== 验证数据结构 ===\n');

    // 1. 查询精益工时结果
    console.log('Step 1: 查询精益工时结果');
    const leanResults = await prisma.calcResult.findMany({
      where: {
        calculationAttendanceCodeId: 1, // 精益工时
      },
      include: {
        calculationAttendanceCode: true,
        employee: {
          include: {
            org: true,
          },
        },
      },
      take: 1,
    });

    console.log(`精益工时结果数量: ${leanResults.length}`);
    if (leanResults.length > 0) {
      const item = leanResults[0];
      console.log('\n精益工时结果示例:');
      console.log(`  员工: ${item.employee?.name} (${item.employeeNo})`);
      console.log(`  日期: ${item.calcDate.toISOString().substring(0, 10)}`);
      console.log(`  班次: ${item.shiftName}`);
      console.log(`  出勤代码: ${item.calculationAttendanceCode?.name} (${item.calculationAttendanceCode?.type})`);
      console.log(`  上班: ${item.punchInTime?.toISOString().substring(11, 19)}`);
      console.log(`  下班: ${item.punchOutTime?.toISOString().substring(11, 19)}`);
      console.log(`  实际工时: ${item.actualHours}小时`);
      console.log(`  账户: ${item.accountName}`);
      console.log(`  状态: ${item.status}`);
      console.log(`  组织: ${item.employee?.org?.name}`);
    }

    // 2. 查询考勤工时结果
    console.log('\nStep 2: 查询考勤工时结果');
    const attendanceResults = await prisma.calcResult.findMany({
      where: {
        calculationAttendanceCodeId: 7, // 考勤工时
      },
      include: {
        calculationAttendanceCode: true,
        employee: {
          include: {
            org: true,
          },
        },
      },
      take: 1,
    });

    console.log(`考勤工时结果数量: ${attendanceResults.length}`);
    if (attendanceResults.length > 0) {
      const item = attendanceResults[0];
      console.log('\n考勤工时结果示例:');
      console.log(`  员工: ${item.employee?.name} (${item.employeeNo})`);
      console.log(`  日期: ${item.calcDate.toISOString().substring(0, 10)}`);
      console.log(`  班次: ${item.shiftName}`);
      console.log(`  出勤代码: ${item.calculationAttendanceCode?.name} (${item.calculationAttendanceCode?.type})`);
      console.log(`  上班: ${item.punchInTime?.toISOString().substring(11, 19)}`);
      console.log(`  下班: ${item.punchOutTime?.toISOString().substring(11, 19)}`);
      console.log(`  实际工时: ${item.actualHours}小时`);
      console.log(`  账户: ${item.accountName}`);
      console.log(`  状态: ${item.status}`);
      console.log(`  组织: ${item.employee?.org?.name}`);
    }

    // 3. 对比字段
    console.log('\nStep 3: 对比数据结构');
    if (leanResults.length > 0 && attendanceResults.length > 0) {
      const leanFields = Object.keys(leanResults[0]).sort();
      const attendanceFields = Object.keys(attendanceResults[0]).sort();

      console.log('\n精益工时字段:', leanFields.join(', '));
      console.log('考勤工时字段:', attendanceFields.join(', '));

      const onlyInLean = leanFields.filter(f => !attendanceFields.includes(f));
      const onlyInAttendance = attendanceFields.filter(f => !leanFields.includes(f));

      if (onlyInLean.length === 0 && onlyInAttendance.length === 0) {
        console.log('\n✅ 字段完全一致！');
      } else {
        if (onlyInLean.length > 0) {
          console.log('\n⚠️  仅在精益工时中:', onlyInLean.join(', '));
        }
        if (onlyInAttendance.length > 0) {
          console.log('\n⚠️  仅在考勤工时中:', onlyInAttendance.join(', '));
        }
      }
    }

    console.log('\n=== 前端使用的关键字段 ===');
    console.log('员工号: employeeNo');
    console.log('员工姓名: employee.name');
    console.log('排班日期: calcDate');
    console.log('班次: shiftName');
    console.log('出勤代码: calculationAttendanceCode.name');
    console.log('开始时间: punchInTime');
    console.log('结束时间: punchOutTime');
    console.log('实际时长: actualHours');
    console.log('劳动力账户: accountName');
    console.log('状态: status (PENDING/CONFIRMED/LOCKED)');

    console.log('\n=== 查看前端更新 ===');
    console.log('1. 访问 http://localhost:5174/');
    console.log('2. 硬刷新页面 (Ctrl+Shift+R 或 Cmd+Shift+R)');
    console.log('3. 进入"计算管理" > "结果查询"');
    console.log('4. 切换到"考勤工时结果"页签');
    console.log('5. 检查列标题是否已更新');

  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
