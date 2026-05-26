const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLeanHoursCalculation() {
  const employeeNo = '202605002';
  const calcDate = '2026-05-10';

  console.log(`=== 测试员工 ${employeeNo} 在 ${calcDate} 的精益工时计算 ===\n`);

  // 1. 查询摆卡记录
  console.log('1. 查询摆卡记录');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: {
        gte: new Date(`${calcDate}T00:00:00.000Z`),
        lt: new Date(`${calcDate}T23:59:59.999Z`),
      },
    },
    include: {
      employee: true,
    },
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录`);
  punchPairs.forEach(pp => {
    console.log(`  - 摆卡ID: ${pp.id}, 账户ID: ${pp.accountId}, 上班: ${pp.inPunchTime}, 下班: ${pp.outPunchTime}`);
  });

  // 2. 查询摆卡账户信息
  console.log('\n2. 查询摆卡账户信息');
  const accountIds = [...new Set(punchPairs.map(pp => pp.accountId).filter(id => id))];
  for (const accountId of accountIds) {
    const account = await prisma.laborAccount.findUnique({
      where: { id: accountId },
    });
    if (account) {
      const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];
      console.log(`  账户 ${accountId}: ${account.namePath}`);
      console.log(`    hierarchyValues长度: ${hierarchyValues.length}`);
      if (hierarchyValues.length > 0) {
        hierarchyValues.forEach(hv => {
          if (hv.selectedValue) {
            console.log(`      - level=${hv.level} ${hv.name}: ${hv.selectedValue.name || hv.selectedValue.code}`);
          }
        });
      }
    }
  }

  // 3. 删除现有的精益工时计算结果
  console.log('\n3. 删除现有的精益工时计算结果');
  const leanCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      type: 'LEAN_HOURS',
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  const leanCodeIds = leanCodes.map(c => c.id);

  const deleted = await prisma.calcResult.deleteMany({
    where: {
      employeeNo,
      calcDate: {
        gte: new Date(`${calcDate}T00:00:00.000Z`),
        lt: new Date(`${calcDate}T23:59:59.999Z`),
      },
      calculationAttendanceCodeId: { in: leanCodeIds },
    },
  });
  console.log(`删除了 ${deleted.count} 条现有计算结果`);

  // 4. 重新计算工时
  console.log('\n4. 重新计算工时');
  // 这里需要调用后端API，但我们可以模拟一下
  // 实际测试需要启动后端服务并调用API

  // 5. 查询计算结果
  console.log('\n5. 查询计算结果');
  const results = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: {
        gte: new Date(`${calcDate}T00:00:00.000Z`),
        lt: new Date(`${calcDate}T23:59:59.999Z`),
      },
      calculationAttendanceCodeId: { in: leanCodeIds },
    },
    include: {
      attendanceCode: {
        select: {
          code: true,
          name: true,
          type: true,
        },
      },
    },
  });

  console.log(`找到 ${results.length} 条精益工时计算结果:`);
  results.forEach(r => {
    console.log(`  - ${r.attendanceCode.name} (${r.attendanceCode.code}): ${r.actualHours}小时, 账户: ${r.accountName}`);
  });

  // 6. 验证结果
  console.log('\n6. 验证结果');
  const hasLineHours = results.some(r => r.attendanceCode.code === 'AC_001');
  const hasProcessHours = results.some(r => r.attendanceCode.code === 'AC_003');

  if (hasLineHours && !hasProcessHours) {
    console.log('✓ 测试通过：只计算出线体工时，没有计算工序工时');
  } else if (hasLineHours && hasProcessHours) {
    console.log('✗ 测试失败：同时计算了线体工时和工序工时');
  } else if (!hasLineHours && !hasProcessHours) {
    console.log('⚠ 没有计算出任何工时，请检查摆卡数据');
  }

  await prisma.$disconnect();
}

testLeanHoursCalculation().catch(console.error);
