import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-12T00:00:00.000Z');

  console.log('=== 检查员工排班和班段配置 ===\n');

  // 1. 查询排班信息
  console.log('1. 排班信息:');
  const schedule = await prisma.schedule.findFirst({
    where: {
      employee: {
        employeeNo,
      },
      scheduleDate: targetDate,
    },
    include: {
      shift: {
        include: {
          segments: {
            orderBy: { startTime: 'asc' },
          },
        },
      },
    },
  });

  if (schedule) {
    console.log(`  排班ID: ${schedule.id}`);
    console.log(`  班次: ${schedule.shift?.name} (ID: ${schedule.shiftId})`);
    console.log(`  标准工时: ${schedule.shift?.standardHours}h`);
    console.log(`  休息时长: ${schedule.shift?.breakHours}h`);
    console.log(`  班段数量: ${schedule.shift?.segments?.length || 0}`);

    if (schedule.shift?.segments) {
      console.log('\n  班段详情:');
      schedule.shift.segments.forEach((seg, idx) => {
        console.log(`    段${idx + 1}: ${seg.startDate} ${seg.startTime} ~ ${seg.endDate} ${seg.endTime}, 类型: ${seg.type}`);
      });
    }

    // 检查 adjustedSegments
    if (schedule.adjustedSegments) {
      console.log('\n  调整后的班段 (adjustedSegments):');
      try {
        const adjusted = JSON.parse(schedule.adjustedSegments);
        adjusted.forEach((seg: any, idx: number) => {
          console.log(`    段${idx + 1}: ID=${seg.id}, 名称=${seg.name}, 账户ID=${seg.accountId || 'null'}`);
        });
      } catch (e) {
        console.log('    解析失败:', e);
      }
    } else {
      console.log('\n  adjustedSegments: null');
    }
  } else {
    console.log('  未找到排班信息');
  }

  // 2. 查询具体的摆卡记录和对应的工时计算
  console.log('\n2. 摆卡记录 193 的工时计算详情:');
  const punchPair = await prisma.punchPair.findUnique({
    where: { id: 193 },
    include: {
      inPunch: {
        include: { device: true, account: true },
      },
      outPunch: {
        include: { device: true, account: true },
      },
      account: true,
    },
  });

  if (punchPair) {
    console.log(`  摆卡: ${punchPair.inPunchTime?.toISOString()} ~ ${punchPair.outPunchTime?.toISOString()}`);
    console.log(`  摆卡账户: ${punchPair.account?.namePath || 'null'}`);
    console.log(`  进卡账户: ${punchPair.inPunch?.account?.namePath || 'null'}`);
    console.log(`  出卡账户: ${punchPair.outPunch?.account?.namePath || 'null'}`);
  }

  // 3. 查询该摆卡对应的所有工时结果
  console.log('\n3. 摆卡 193 生成的工时结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: targetDate,
      // 注意：这里没有 punchPairId 字段，无法直接关联
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  calcResults.forEach((result, idx) => {
    const inTime = result.punchInTime?.toISOString() || 'null';
    const outTime = result.punchOutTime?.toISOString() || 'null';
    console.log(`  工时${idx + 1}: ${inTime} ~ ${outTime}, 账户: ${result.accountName || 'null'}, 出勤代码: ${result.calculationAttendanceCode?.name || 'null'}, 工时: ${result.actualHours}h`);
  });
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
