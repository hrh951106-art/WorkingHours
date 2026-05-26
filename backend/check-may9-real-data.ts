import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMay9RealData() {
  console.log('========================================');
  console.log('分析 2026-05-09 的真实摆卡数据');
  console.log('========================================\n');

  // 1. 查询2026-05-09的摆卡记录
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202604003',
      id: { in: [178, 179] },
    },
    include: {
      account: true,
      inPunch: {
        include: {
          device: true,
        },
      },
      outPunch: {
        include: {
          device: true,
        },
      },
    },
  });

  console.log('【摆卡记录】\n');

  punchPairs.forEach((pair) => {
    const formatTime = (ts: number | null) => ts ? new Date(ts).toISOString().substring(11, 16) : '-';

    console.log(`--- ID: ${pair.id} ---`);
    console.log(`  上班卡: ${formatTime(pair.inPunchTime as any)} (设备${pair.inPunch?.deviceId})`);
    console.log(`  下班卡: ${formatTime(pair.outPunchTime as any)} (设备${pair.outPunch?.deviceId})`);
    console.log(`  账户: ${pair.account?.name || '-'}`);
    console.log(`  工时: ${pair.workHours}`);
    console.log('');
  });

  // 2. 查询这些摆卡记录的工时计算结果
  console.log('【工时计算结果】\n');

  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202604003',
      calcDate: new Date('2026-05-09'),
    },
    include: {
      calculationAttendanceCode: true,
      attendanceCode: true,
    },
  });

  console.log(`找到 ${calcResults.length} 条工时计算结果\n`);

  if (calcResults.length === 0) {
    console.log('❌ 没有找到工时计算结果\n');

    // 分析可能的原因
    console.log('【分析可能的原因】\n');

    // 检查出勤代码配置
    console.log('1. 检查出勤代码配置：');
    const attendanceCodes = await prisma.calculationAttendanceCode.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { code: 'asc' },
    });

    console.log(`   找到 ${attendanceCodes.length} 个活跃的出勤代码\n`);
    attendanceCodes.forEach((code) => {
      console.log(`   - ${code.code}: ${code.name} (计算金额: ${code.calculateAmount})`);
    });

    // 检查排班信息
    console.log('\n2. 检查排班信息：');
    const employee = await prisma.employee.findFirst({
      where: { employeeNo: '202604003' },
      select: { id: true },
    });

    if (employee) {
      const schedules = await prisma.schedule.findMany({
        where: {
          employeeId: employee.id,
          scheduleDate: new Date('2026-05-09'),
        },
        include: {
          shift: true,
        },
      });

      console.log(`   找到 ${schedules.length} 条排班记录\n`);

      if (schedules.length === 0) {
        console.log('   ❌ 该员工在2026-05-09没有排班');
        console.log('   💡 无排班时，工时计算需要检查以下配置：');
        console.log('      - 打卡规则的无排班配置 (unscheduledConfig)');
        console.log('      - 缺勤出勤代码配置');
      } else {
        schedules.forEach((schedule) => {
          console.log(`   - 班次: ${schedule.shift?.name} (${schedule.shift?.code})`);
          console.log(`     类型: ${schedule.shift?.type}`);
          console.log(`     标准工时: ${schedule.shift?.standardHours}h`);
        });
      }
    }

    // 检查计算执行记录
    console.log('\n3. 检查计算执行记录：');
    const calcExecutions = await prisma.calculationExecution.findMany({
      where: {
        calcDate: new Date('2026-05-09'),
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    console.log(`   找到 ${calcExecutions.length} 条计算执行记录\n`);

    if (calcExecutions.length === 0) {
      console.log('   ❌ 没有找到2026-05-09的计算执行记录');
      console.log('   💡 可能的原因：');
      console.log('      - 还没有执行过工时计算');
      console.log('      - 计算执行失败但没有记录');
    } else {
      calcExecutions.forEach((exec) => {
        console.log(`   - 执行时间: ${exec.createdAt.toISOString()}`);
        console.log(`     状态: ${exec.status}`);
        console.log(`     员工数: ${exec.employeeCount}`);
        console.log(`     记录数: ${exec.recordCount}`);
        if (exec.errorMessage) {
          console.log(`     错误: ${exec.errorMessage}`);
        }
      });
    }

  } else {
    calcResults.forEach((result) => {
      console.log(`--- 工时结果 ---`);
      console.log(`  出勤代码: ${result.calculationAttendanceCode?.name || result.attendanceCode?.name || '-'}`);
      console.log(`  标准工时: ${result.standardHours}`);
      console.log(`  实际工时: ${result.actualHours}`);
      console.log(`  加班工时: ${result.overtimeHours}`);
      console.log(`  账户: ${result.accountName || '-'}`);
      console.log('');
    });
  }

  console.log('========================================');
}

checkMay9RealData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('错误:', err);
    process.exit(1);
  });
