import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseG01Execution() {
  console.log('========================================');
  console.log('诊断G01配置执行情况');
  console.log('========================================\n');

  // 1. 查看G01配置
  console.log('1. 查看G01配置:');
  console.log('----------------------------------------');
  const g01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'G01',
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  if (!g01Config) {
    console.log('未找到G01配置\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`配置代码: ${g01Config.configCode}`);
  console.log(`配置名称: ${g01Config.configName}`);
  console.log(`配置ID: ${g01Config.id}`);
  console.log(`版本: ${g01Config.version}\n`);

  for (const rule of g01Config.rules) {
    console.log(`规则: ${rule.ruleName}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);
    console.log(`  分摊范围ID: ${rule.allocationScopeId || '未设置'}`);
    console.log(`  层级配置: ${rule.allocationHierarchyLevels}`);
  }
  console.log();

  // 2. 查询G01配置的最新分摊结果
  console.log('2. 查询G01配置的最新分摊结果:');
  console.log('----------------------------------------');

  const latestResults = await prisma.allocationResult.findMany({
    where: {
      configId: g01Config.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  if (latestResults.length === 0) {
    console.log('未找到G01的分摊结果\n');
  } else {
    const latestBatchNo = latestResults[0].batchNo;
    const latestDate = latestResults[0].recordDate;

    console.log(`最新批次号: ${latestBatchNo}`);
    console.log(`分摊日期: ${latestDate.toISOString().split('T')[0]}`);
    console.log(`结果数量: ${latestResults.length} 条\n`);

    // 按人员分组
    const resultsByEmployee = latestResults.reduce((acc, r) => {
      const key = `${r.sourceEmployeeNo} - ${r.sourceEmployeeName}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(r);
      return acc;
    }, {} as Record<string, any[]>);

    console.log(`分摊涉及 ${Object.keys(resultsByEmployee).length} 个员工:\n`);

    for (const [employee, empResults] of Object.entries(resultsByEmployee)) {
      console.log(`【${employee}】`);
      console.log(`  来源账户: ${empResults[0].sourceAccountName}`);
      console.log(`  来源工时: ${empResults[0].sourceHours} 小时`);
      console.log(`  分摊目标数: ${empResults.length}`);
      console.log(`  分摊详情:`);

      for (const r of empResults) {
        console.log(`    - ${r.targetName}`);
        console.log(`      比重值: ${r.basisValue}, 总值: ${r.weightValue}`);
        console.log(`      分摊比例: ${(r.allocationRatio * 100).toFixed(2)}%, 分摊工时: ${r.allocatedHours.toFixed(4)}小时`);
      }
      console.log();
    }

    // 检查是否包含L3
    const hasL3 = latestResults.some(r => r.targetName.includes('L3'));
    if (hasL3) {
      console.log('✓ 分摊结果中包含L3产线');
    } else {
      console.log('❌ 分摊结果中不包含L3产线');
    }
    console.log();
  }

  // 3. 查询3月11日的计算结果
  console.log('3. 查询3月11日的间接工时计算结果:');
  console.log('----------------------------------------');

  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: new Date('2026-03-11'),
    },
    include: {
      employee: true,
      attendanceCode: true,
    },
    orderBy: {
      actualHours: 'desc',
    },
  });

  console.log(`找到 ${calcResults.length} 条计算结果\n`);

  for (const cr of calcResults) {
    if (cr.actualHours > 0) {
      console.log(`- ${cr.employee.name} (${cr.employee.employeeNo})`);
      console.log(`  账户: ${cr.accountName || '未知'}`);
      console.log(`  工时: ${cr.actualHours} 小时`);
      console.log(`  考勤代码: ${cr.attendanceCode?.name || cr.attendanceCode?.code || '无'}`);
    }
  }
  console.log();

  // 4. 查找有间接工时的员工
  console.log('4. 有间接工时的员工:');
  console.log('----------------------------------------');

  const indirectEmployees = calcResults.filter(cr =>
    cr.accountName?.includes('间接设备') && cr.actualHours > 0
  );

  console.log(`找到 ${indirectEmployees.length} 个有间接工时的员工:\n`);

  for (const cr of indirectEmployees) {
    console.log(`- ${cr.employee.name} (${cr.employee.employeeNo})`);
    console.log(`  账户: ${cr.accountName || '未知'}`);
    console.log(`  工时: ${cr.actualHours} 小时`);
    console.log(`  考勤代码: ${cr.attendanceCode?.name || cr.attendanceCode?.code || '无'}`);
  }
  console.log();

  // 5. 检查L3产线的间接设备账户
  console.log('5. 检查L3产线的间接设备账户:');
  console.log('----------------------------------------');

  const l3IndirectAccount = await prisma.laborAccount.findFirst({
    where: {
      name: {
        endsWith: 'L3产线////间接设备',
      },
    },
  });

  if (l3IndirectAccount) {
    console.log(`✓ L3间接设备账户存在: ${l3IndirectAccount.name} (ID: ${l3IndirectAccount.id})`);
  } else {
    console.log('❌ L3间接设备账户不存在');
  }
  console.log();

  // 6. 检查是否有员工的考勤代码匹配G01的规则
  console.log('6. 检查考勤代码匹配:');
  console.log('----------------------------------------');

  const rule = g01Config.rules[0];
  const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');

  console.log(`G01规则的考勤代码: ${JSON.stringify(attendanceCodes)}`);

  if (attendanceCodes.length === 0) {
    console.log('  考勤代码为空，规则应该匹配所有间接工时');
  } else {
    console.log('  只有以上考勤代码的员工才会被分摊');
  }
  console.log();

  // 7. 查看问题员工的详细分摊情况
  if (indirectEmployees.length > 0) {
    const problemEmployee = indirectEmployees[0];

    console.log('========================================');
    console.log('问题员工详细分析');
    console.log('========================================\n');

    console.log(`员工: ${problemEmployee.employee.name}`);
    console.log(`间接工时: ${problemEmployee.actualHours} 小时`);
    console.log(`账户: ${problemEmployee.accountName || '未知'}`);
    console.log(`考勤代码: ${problemEmployee.attendanceCode?.name || problemEmployee.attendanceCode?.code || '无'}`);
    console.log();

    // 查询该员工的G01分摊结果
    const employeeAllocationResults = await prisma.allocationResult.findMany({
      where: {
        configId: g01Config.id,
        sourceEmployeeNo: problemEmployee.employeeNo,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (employeeAllocationResults.length === 0) {
      console.log('❌ 该员工没有G01的分摊结果');
      console.log('\n可能原因:');
      console.log('1. 考勤代码不匹配');
      console.log('2. 分摊基础筛选条件不满足');
      console.log('3. 层级配置不包含该员工');
    } else {
      console.log(`找到 ${employeeAllocationResults.length} 条分摊结果:\n`);

      for (const r of employeeAllocationResults) {
        console.log(`批次: ${r.batchNo}`);
        console.log(`日期: ${r.recordDate.toISOString().split('T')[0]}`);
        console.log(`  - ${r.targetName}: ${r.allocatedHours.toFixed(4)}小时 (占比: ${(r.allocationRatio * 100).toFixed(2)}%)`);
      }
    }
  }

  console.log('\n========================================');
}

diagnoseG01Execution()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
