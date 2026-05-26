import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepInvestigateA02() {
  console.log('🔍 深入排查A02分摊规则问题\n');

  // 1. 检查分摊结果表是否有数据
  console.log('1️⃣ 检查AllocationResult表数据:');
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      allocationConfigId: 2,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });
  console.log('AllocationResult记录数:', allocationResults.length);
  if (allocationResults.length > 0) {
    console.log('最近的分摊结果:', allocationResults.map(r => ({
      id: r.id,
      employeeId: r.employeeId,
      attendanceCode: r.attendanceCode,
      amount: r.amount,
      createdAt: r.createdAt,
    })));
  }

  // 2. 检查CalcResult中A02和A04的数据
  console.log('\n2️⃣ 检查CalcResult中的A02和A04数据:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      attendanceCode: {
        in: ['A02', 'A04'],
      },
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 20,
  });
  console.log('A02和A04记录总数:', calcResults.length);

  const a02Data = calcResults.filter(r => r.attendanceCode === 'A02');
  const a04Data = calcResults.filter(r => r.attendanceCode === 'A04');
  console.log('A02(线体工时)记录数:', a02Data.length);
  console.log('A04(车间工时)记录数:', a04Data.length);

  if (a02Data.length > 0) {
    console.log('A02示例数据:', {
      employeeId: a02Data[0].employeeId,
      attendanceCode: a02Data[0].attendanceCode,
      amount: a02Data[0].amount,
      calcDate: a02Data[0].calcDate,
    });
  }
  if (a04Data.length > 0) {
    console.log('A04示例数据:', {
      employeeId: a04Data[0].employeeId,
      attendanceCode: a04Data[0].attendanceCode,
      amount: a04Data[0].amount,
      calcDate: a04Data[0].calcDate,
    });
  }

  // 3. 检查分摊规则的完整配置
  console.log('\n3️⃣ 检查分摊规则的完整配置:');
  const allocationRule = await prisma.allocationRuleConfig.findFirst({
    where: {
      id: 4,
    },
    include: {
      targets: {
        include: {
          target: true,
        },
      },
    },
  });
  console.log('规则配置:', {
    id: allocationRule?.id,
    ruleName: allocationRule?.ruleName,
    type: allocationRule?.type,
    basis: allocationRule?.basis,
    allocationAttendanceCodes: allocationRule?.allocationAttendanceCodes,
    targetsCount: allocationRule?.targets.length,
    targets: allocationRule?.targets.map(t => ({
      attendanceCode: t.target.attendanceCode,
      percentage: t.percentage,
    })),
  });

  // 4. 检查分摊计算记录
  console.log('\n4️⃣ 检查AllocationCalculationRecord:');
  const calcRecords = await prisma.allocationCalculationRecord.findMany({
    where: {
      allocationConfigId: 2,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });
  console.log('计算记录数:', calcRecords.length);
  if (calcRecords.length > 0) {
    console.log('最近计算记录:', calcRecords.map(r => ({
      id: r.id,
      status: r.status,
      startDate: r.startDate,
      endDate: r.endDate,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
    })));
  }

  // 5. 检查分摊配置的定义
  console.log('\n5️⃣ 检查分摊配置定义:');
  const allocationConfig = await prisma.allocationConfig.findUnique({
    where: {
      id: 2,
    },
    include: {
      rules: {
        include: {
          targets: {
            include: {
              target: true,
            },
          },
        },
      },
    },
  });
  console.log('配置详情:', {
    id: allocationConfig?.id,
    configName: allocationConfig?.configName,
    status: allocationConfig?.status,
    rulesCount: allocationConfig?.rules.length,
    rules: allocationConfig?.rules.map(r => ({
      ruleName: r.ruleName,
      type: r.type,
      allocationAttendanceCodes: r.allocationAttendanceCodes,
      hasTargets: r.targets.length > 0,
    })),
  });

  await prisma.$disconnect();
}

deepInvestigateA02().catch(console.error);
