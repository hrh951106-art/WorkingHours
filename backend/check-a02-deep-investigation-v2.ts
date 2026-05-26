import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepInvestigateA02() {
  console.log('🔍 深入排查A02分摊规则问题\n');

  // 1. 检查分摊结果表是否有数据
  console.log('1️⃣ 检查AllocationResult表数据 (configId=2):');
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      configId: 2,
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
      sourceEmployeeNo: r.sourceEmployeeNo,
      attendanceCode: r.attendanceCode,
      allocatedHours: r.allocatedHours,
      createdAt: r.createdAt,
    })));
  } else {
    console.log('❌ 没有找到分摊结果记录！');
  }

  // 2. 检查CalcResult中A02和A04的数据（通过CalculationAttendanceCode）
  console.log('\n2️⃣ 检查CalcResult中的A02和A04数据:');
  const a02Code = await prisma.calculationAttendanceCode.findFirst({
    where: {
      code: 'A02',
    },
  });
  const a04Code = await prisma.calculationAttendanceCode.findFirst({
    where: {
      code: 'A04',
    },
  });

  console.log('A02考勤代码ID:', a02Code?.id);
  console.log('A04考勤代码ID:', a04Code?.id);

  const calcResults = await prisma.calcResult.findMany({
    where: {
      calculationAttendanceCodeId: {
        in: [a02Code?.id, a04Code?.id].filter(Boolean) as number[],
      },
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 20,
  });
  console.log('A02和A04记录总数:', calcResults.length);

  const a02Data = calcResults.filter(r => r.calculationAttendanceCodeId === a02Code?.id);
  const a04Data = calcResults.filter(r => r.calculationAttendanceCodeId === a04Code?.id);
  console.log('A02(线体工时)记录数:', a02Data.length);
  console.log('A04(车间工时)记录数:', a04Data.length);

  if (a02Data.length > 0) {
    console.log('A02示例数据:', {
      employeeNo: a02Data[0].employeeNo,
      calculationAttendanceCodeId: a02Data[0].calculationAttendanceCodeId,
      amount: a02Data[0].amount,
      calcDate: a02Data[0].calcDate,
    });
  }
  if (a04Data.length > 0) {
    console.log('A04示例数据:', {
      employeeNo: a04Data[0].employeeNo,
      calculationAttendanceCodeId: a04Data[0].calculationAttendanceCodeId,
      amount: a04Data[0].amount,
      calcDate: a04Data[0].calcDate,
    });
  }

  // 3. 检查分摊规则的完整配置
  console.log('\n3️⃣ 检查分摊规则的完整配置 (Rule ID=4):');
  const allocationRule = await prisma.allocationRuleConfig.findFirst({
    where: {
      id: 4,
    },
    include: {
      targets: true,
    },
  });

  if (allocationRule) {
    console.log('规则配置:', {
      id: allocationRule.id,
      ruleName: allocationRule.ruleName,
      ruleType: allocationRule.ruleType,
      allocationBasis: allocationRule.allocationBasis,
      allocationAttendanceCodes: allocationRule.allocationAttendanceCodes,
      status: allocationRule.status,
      targetsCount: allocationRule.targets.length,
      targets: allocationRule.targets.map(t => ({
        targetType: t.targetType,
        targetId: t.targetId,
        targetName: t.targetName,
        weight: t.weight,
      })),
    });
  }

  // 4. 解析allocationAttendanceCodes
  console.log('\n4️⃣ 解析allocationAttendanceCodes字段:');
  try {
    const attendanceCodes = JSON.parse(allocationRule?.allocationAttendanceCodes || '[]');
    console.log('解析后的考勤代码列表:', attendanceCodes);
    console.log('考勤代码数量:', attendanceCodes.length);
  } catch (e) {
    console.log('❌ allocationAttendanceCodes解析失败:', allocationRule?.allocationAttendanceCodes);
  }

  // 5. 检查分摊配置的定义
  console.log('\n5️⃣ 检查分摊配置定义 (Config ID=2):');
  const allocationConfig = await prisma.allocationConfig.findUnique({
    where: {
      id: 2,
    },
    include: {
      rules: {
        include: {
          targets: true,
        },
      },
    },
  });

  if (allocationConfig) {
    console.log('配置详情:', {
      id: allocationConfig.id,
      configName: allocationConfig.configName,
      status: allocationConfig.status,
      rulesCount: allocationConfig.rules.length,
      rules: allocationConfig.rules.map(r => ({
        ruleName: r.ruleName,
        ruleType: r.ruleType,
        allocationAttendanceCodes: r.allocationAttendanceCodes,
        hasTargets: r.targets.length > 0,
        targetsCount: r.targets.length,
      })),
    });
  }

  // 6. 检查分摊计算触发记录（查找可能的日志表）
  console.log('\n6️⃣ 检查系统日志和计算记录:');
  // 看看是否有执行记录或日志表
  const tables = await prisma.$queryRaw`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name LIKE '%allocation%'
    ORDER BY name
  `;
  console.log('Allocation相关表:', tables);

  await prisma.$disconnect();
}

deepInvestigateA02().catch(console.error);
