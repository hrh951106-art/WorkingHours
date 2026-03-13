import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseG02Config() {
  console.log('========================================');
  console.log('诊断G02配置');
  console.log('========================================\n');

  // 1. 查看G02配置
  console.log('1. 查看G02配置:');
  console.log('----------------------------------------');
  const g02Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'G02',
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

  if (!g02Config) {
    console.log('❌ 未找到G02配置\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`配置代码: ${g02Config.configCode}`);
  console.log(`配置名称: ${g02Config.configName}`);
  console.log(`配置ID: ${g02Config.id}`);
  console.log(`版本: ${g02Config.version}\n`);

  for (const rule of g02Config.rules) {
    console.log(`规则: ${rule.ruleName}`);
    console.log(`  规则ID: ${rule.id}`);
    console.log(`  规则类型: ${rule.ruleType}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);
    console.log(`  分摊范围ID: ${rule.allocationScopeId || '未设置'}`);

    // 解析层级配置
    const hierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');
    console.log(`  层级配置: ${JSON.stringify(hierarchyLevels)}`);

    // 解析考勤代码
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    console.log(`  考勤代码: ${JSON.stringify(attendanceCodes)}`);

    // 解析基础筛选
    const basisFilter = JSON.parse(rule.basisFilter || '{}');
    console.log(`  基础筛选: ${JSON.stringify(basisFilter)}`);
  }
  console.log();

  // 2. 查询G02的分摊结果
  console.log('2. 查询G02的分摊结果:');
  console.log('----------------------------------------');

  const g02Results = await prisma.allocationResult.findMany({
    where: {
      configId: g02Config.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  console.log(`找到 ${g02Results.length} 条分摊结果\n`);

  if (g02Results.length === 0) {
    console.log('❌ G02没有分摊结果数据');
    console.log('\n可能原因:');
    console.log('1. 没有执行过分摊操作');
    console.log('2. 分摊操作执行失败');
    console.log('3. 没有符合条件的间接工时数据');
  } else {
    console.log('最近的分摊结果:\n');
    for (const r of g02Results) {
      console.log(`批次: ${r.batchNo}`);
      console.log(`日期: ${r.recordDate.toISOString().split('T')[0]}`);
      console.log(`员工: ${r.sourceEmployeeNo} - ${r.sourceEmployeeName}`);
      console.log(`  来源工时: ${r.sourceHours}小时`);
      console.log(`  目标: ${r.targetName}`);
      console.log(`  分摊工时: ${r.allocatedHours.toFixed(4)}小时`);
      console.log();
    }
  }
  console.log();

  // 3. 检查分摊范围配置
  console.log('3. 检查分摊范围配置:');
  console.log('----------------------------------------');

  const rule = g02Config.rules[0];
  if (rule.allocationScopeId) {
    const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
      where: { id: rule.allocationScopeId },
    });

    if (hierarchyConfig) {
      console.log(`分摊范围: ${hierarchyConfig.name} (ID: ${hierarchyConfig.id})`);
      console.log(`映射类型: ${hierarchyConfig.mappingType}`);
      console.log(`映射值: ${hierarchyConfig.mappingValue}`);
      console.log(`级别: ${hierarchyConfig.level}`);
    } else {
      console.log(`❌ 分摊范围配置不存在 (ID: ${rule.allocationScopeId})`);
    }
  } else {
    console.log('❌ 分摊范围未设置');
  }
  console.log();

  // 4. 查询间接工时数据
  console.log('4. 查询间接工时数据:');
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

  const indirectResults = calcResults.filter(cr =>
    cr.accountName?.includes('间接设备') && cr.actualHours > 0
  );

  console.log(`找到 ${indirectResults.length} 个有间接工时的员工\n`);

  if (indirectResults.length === 0) {
    console.log('❌ 没有间接工时数据');
    console.log('\n这就是G02没有分摊结果的原因：没有间接工时可以分摊');
  } else {
    console.log('有间接工时的员工:\n');

    for (const cr of indirectResults.slice(0, 10)) {
      console.log(`- ${cr.employee.name} (${cr.employee.employeeNo})`);
      console.log(`  账户: ${cr.accountName || '未知'}`);
      console.log(`  工时: ${cr.actualHours} 小时`);
      console.log(`  考勤代码: ${cr.attendanceCode?.name || cr.attendanceCode?.code || '无'}`);

      // 检查考勤代码是否匹配
      const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
      if (attendanceCodes.length > 0) {
        const isMatch = attendanceCodes.some((ac: any) => {
          if (typeof ac === 'number') {
            return ac === cr.attendanceCodeId;
          }
          return false;
        });

        if (isMatch) {
          console.log(`  ✓ 考勤代码匹配`);
        } else {
          console.log(`  ✗ 考勤代码不匹配（需要: ${JSON.stringify(attendanceCodes)}）`);
        }
      } else {
        console.log(`  ✓ 规则没有限制考勤代码`);
      }
      console.log();
    }
  }
  console.log();

  // 5. 检查分摊依据和数据可用性
  console.log('5. 检查分摊依据和数据可用性:');
  console.log('----------------------------------------');

  const allocationBasis = rule.allocationBasis;
  console.log(`分摊依据: ${allocationBasis}`);

  // 检查是否有对应的数据
  if (allocationBasis === 'ACTUAL_HOURS') {
    console.log('需要数据: 实际工时');
  } else if (allocationBasis === 'ACTUAL_YIELDS') {
    console.log('需要数据: 实际产量');

    // 检查产量数据
    const productionRecords = await prisma.productionRecord.findMany({
      where: {
        recordDate: new Date('2026-03-11'),
        deletedAt: null,
      },
    });

    console.log(`  3月11日产量记录数: ${productionRecords.length}`);

    if (productionRecords.length === 0) {
      console.log('  ❌ 没有产量数据，无法执行分摊');
    } else {
      let totalQty = 0;
      for (const pr of productionRecords) {
        totalQty += (pr.actualQty || 0);
      }
      console.log(`  ✓ 总产量: ${totalQty} 件`);
    }
  } else if (allocationBasis === 'EQUIVALENT_YIELDS') {
    console.log('需要数据: 同效产量（实际产量 × 折算系数）');
  } else if (allocationBasis === 'STANDARD_HOURS') {
    console.log('需要数据: 标准工时（实际产量 × 标准工时）');
  }
  console.log();

  // 6. 检查开线记录
  console.log('6. 检查开线记录:');
  console.log('----------------------------------------');

  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date('2026-03-11'),
      deletedAt: null,
      participateInAllocation: true,
    },
    include: {
      line: true,
    },
  });

  console.log(`3月11日参与分摊的开线记录数: ${lineShifts.length}`);

  if (lineShifts.length === 0) {
    console.log('❌ 没有开线记录，无法执行分摊');
  } else {
    console.log('\n开线产线:');
    for (const ls of lineShifts) {
      console.log(`  - ${ls.line.name} (${ls.line.code})`);
      console.log(`    工厂: ${ls.line.orgName} (ID: ${ls.line.orgId})`);
    }
  }
  console.log();

  // 7. 总结问题
  console.log('========================================');
  console.log('问题总结');
  console.log('========================================\n');

  const hasIndirectHours = indirectResults.length > 0;
  const hasLineShifts = lineShifts.length > 0;
  const hasAllocationScope = rule.allocationScopeId !== null;

  console.log('检查项:');
  console.log(`1. 是否有间接工时数据: ${hasIndirectHours ? '✓ 是' : '✗ 否'}`);
  console.log(`2. 是否有开线记录: ${hasLineShifts ? '✓ 是' : '✗ 否'}`);
  console.log(`3. 是否设置了分摊范围: ${hasAllocationScope ? '✓ 是' : '✗ 否'}`);
  console.log();

  if (!hasIndirectHours) {
    console.log('❌ 主要问题: 没有间接工时数据');
    console.log('\n解决方案:');
    console.log('- 需要先有员工的间接工时计算结果');
    console.log('- 或者检查考勤代码配置是否正确');
  } else if (!hasLineShifts) {
    console.log('❌ 主要问题: 没有开线记录');
    console.log('\n解决方案:');
    console.log('- 需要在分摊日期创建产线的开线记录');
  } else if (!hasAllocationScope) {
    console.log('❌ 主要问题: 分摊范围未设置');
    console.log('\n解决方案:');
    console.log('- 需要设置allocationScopeId为工厂级别（28）');
  } else {
    console.log('✓ 所有基本条件都满足');
    console.log('\n但仍然没有分摊结果，可能原因:');
    console.log('- 执行分摊时出错');
    console.log('- 产线没有间接设备账户');
    console.log('- 其他业务逻辑限制');
  }

  console.log('\n========================================');
}

diagnoseG02Config()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
