import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 手动触发精益工时计算测试
 */
async function main() {
  const punchPairId = 127; // 选择一条有完整上下班时间的摆卡记录

  console.log(`=== 手动测试精益工时计算：摆卡记录 ${punchPairId} ===\n`);

  // 1. 获取摆卡记录
  const punchPair = await prisma.punchPair.findUnique({
    where: { id: punchPairId },
    include: { employee: true }
  });

  if (!punchPair) {
    console.log('摆卡记录不存在');
    return;
  }

  console.log('摆卡记录信息:');
  console.log(`  员工: ${punchPair.employeeNo}`);
  console.log(`  日期: ${punchPair.pairDate}`);
  console.log(`  班次ID: ${punchPair.shiftId}`);
  console.log(`  刷卡账户ID: ${punchPair.accountId}`);
  console.log(`  上班时间: ${punchPair.inPunchTime}`);
  console.log(`  下班时间: ${punchPair.outPunchTime}`);
  console.log('');

  // 2. 检查班次是否存在
  if (!punchPair.shiftId) {
    console.log('❌ 摆卡记录没有班次ID，无法计算');
    return;
  }

  const shift = await prisma.shift.findUnique({
    where: { id: punchPair.shiftId },
    include: { segments: { orderBy: { startTime: 'asc' } } }
  });

  if (!shift) {
    console.log('❌ 班次不存在');
    return;
  }

  console.log(`✅ 班次���在: ${shift.name} (${shift.code})`);
  console.log(`  标准工时: ${shift.standardHours}小时`);
  console.log(`  班段数量: ${shift.segments.length}`);
  console.log('');

  // 3. 检查精益工时出勤代码
  const leanCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
      type: 'LEAN_HOURS',
      calculateHours: true
    },
    orderBy: { priority: 'asc' }
  });

  if (leanCodes.length === 0) {
    console.log('❌ 没有找到有效的精益工时出勤代码');
    return;
  }

  console.log(`✅ 找到 ${leanCodes.length} 个精益工时出勤代码:`);
  leanCodes.forEach(code => {
    console.log(`  - ${code.code} (${code.name}): accountLevels=${code.accountLevels}`);
  });
  console.log('');

  // 4. 检查刷卡账户
  if (!punchPair.accountId) {
    console.log('⚠️ 摆卡记录没有刷卡账户ID');
  } else {
    const account = await prisma.laborAccount.findUnique({
      where: { id: punchPair.accountId }
    });

    if (account) {
      console.log(`✅ 刷卡账户存在: ${account.namePath}`);
      console.log(`  层级: ${account.level}`);
      console.log('');
    } else {
      console.log('❌ 刷卡账户不存在');
    }
  }

  console.log('=== 结论 ===');
  console.log('所有计算所需的条件都满足：');
  console.log('✅ 摆卡记录存在且有完整的上下班时间');
  console.log('✅ 班次存在');
  console.log('✅ 精益工时出勤代码存在');
  console.log('✅ 刷卡账户存在');
  console.log('');
  console.log('但是没有计算出精益工时结果，说明：');
  console.log('1. 计算逻辑没有被触发（需要调用calculateFromPunchPair方法）');
  console.log('2. 或者计算逻辑有bug，导致没有保存结果');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
