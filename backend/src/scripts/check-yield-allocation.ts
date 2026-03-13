import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkYieldAllocation() {
  console.log('========================================');
  console.log('检查A02_COPY_1773285414740规则分摊问题');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 查找分摊配置
  console.log('1. 查找分摊配置...');
  const config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A02_COPY_1773285414740',
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
      rules: {
        where: { deletedAt: null },
        include: {
          targets: true,
        },
      },
    },
  });

  if (!config) {
    console.log('   ❌ 未找到配置 A02_COPY_1773285414740\n');
    return;
  }

  console.log(`   ✓ 找到配置: ${config.configName}`);
  console.log(`   - 状态: ${config.status}`);
  console.log(`   - 规则数量: ${config.rules.length}\n`);

  // 2. 检查规则详情
  console.log('2. 检查分摊规则...');
  config.rules.forEach((rule, idx) => {
    console.log(`   规则${idx + 1}:`);
    console.log(`   - 规则名称: ${rule.ruleName}`);
    console.log(`   - 规则类型: ${rule.ruleType}`);
    console.log(`   - 分摊依据: ${rule.allocationBasis}`);
    console.log(`   - 状态: ${rule.status}`);
    console.log(`   - 目标数量: ${rule.targets.length}`);
  });
  console.log();

  // 3. 检查李四的工时数据
  console.log('3. 检查李四的工时数据...');
  const lisiResults = await prisma.calcResult.findMany({
    where: {
      calcDate,
      employeeNo: 'A02',
    },
    include: {
      employee: true,
      attendanceCode: true,
    },
  });

  console.log(`   找到 ${lisiResults.length} 条工时记录:\n`);

  // 按出勤代码分组
  const byAttendanceCode: Record<string, any[]> = {};
  lisiResults.forEach(r => {
    const code = r.attendanceCode?.code || 'UNKNOWN';
    if (!byAttendanceCode[code]) {
      byAttendanceCode[code] = [];
    }
    byAttendanceCode[code].push(r);
  });

  Object.entries(byAttendanceCode).forEach(([code, results]) => {
    const totalHours = results.reduce((sum, r) => sum + r.actualHours, 0);
    console.log(`   ${code} - ${results[0].attendanceCode?.name || 'N/A'}: ${totalHours}h (${results.length}条记录)`);
  });
  console.log();

  // 4. 检查分摊源配置
  console.log('4. 检查分摊源配置...');
  if (config.sourceConfig) {
    const attendanceCodes = JSON.parse(config.sourceConfig.attendanceCodes || '[]');
    console.log(`   需要分摊的出勤代码: ${attendanceCodes.join(', ')}`);

    // 检查李四是否有需要分摊的工时
    const needsAllocation = lisiResults.filter(r =>
      attendanceCodes.includes(r.attendanceCode?.code)
    );

    if (needsAllocation.length === 0) {
      console.log('   ❌ 李四没有需要分摊的工时记录\n');
    } else {
      const totalHours = needsAllocation.reduce((sum, r) => sum + r.actualHours, 0);
      console.log(`   ✓ 李四有 ${totalHours}h 工时需要分摊\n`);
    }
  } else {
    console.log('   ❌ 未配置分摊源\n');
  }

  // 5. 检查3月11日的产量数据
  console.log('5. 检查3月11日的产量数据...');
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: calcDate,
      deletedAt: null,
    },
    include: {
      line: true,
    },
  });

  console.log(`   找到 ${productionRecords.length} 条产量记录\n`);

  // 按产线和班次汇总
  const byLineAndShift: Record<string, number> = {};
  productionRecords.forEach(r => {
    if (r.lineId && r.shiftId) {
      const key = `${r.lineId}-${r.shiftId}`;
      byLineAndShift[key] = (byLineAndShift[key] || 0) + r.actualQty;
    }
  });

  if (Object.keys(byLineAndShift).length === 0) {
    console.log('   ❌ 没有产量数据！无法进行按产量分摊\n');
  } else {
    console.log('   按产线-班次汇总的产量:');
    Object.entries(byLineAndShift).forEach(([key, qty]) => {
      const [lineId, shiftId] = key.split('-');
      const line = productionRecords.find(r =>
        r.lineId === +lineId && r.shiftId === +shiftId
      );
      console.log(`   产线${lineId} 班次${shiftId}: ${qty}`);
    });
    console.log();
  }

  // 6. 检查3月11日的开线计划
  console.log('6. 检查3月11日的开线计划...');
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: calcDate,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      line: true,
    },
  });

  console.log(`   找到 ${lineShifts.length} 条开线计划\n`);

  const activeLines = lineShifts.filter(ls => ls.participateInAllocation);
  console.log(`   其中参与分摊的产线: ${activeLines.length} 条\n`);

  activeLines.forEach(ls => {
    console.log(`   - ${ls.line?.name} (班次ID: ${ls.shiftId})`);
  });
  console.log();

  // 7. 检查是否有分摊结果
  console.log('7. 检查分摊结果...');
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      recordDate: calcDate,
      configId: config.id,
    },
  });

  console.log(`   找到 ${allocationResults.length} 条分摊结果\n`);

  if (allocationResults.length === 0) {
    console.log('========================================');
    console.log('问题诊断:');
    console.log('========================================\n');

    if (Object.keys(byLineAndShift).length === 0) {
      console.log('❌ 主要原因: 3月11日没有产量数据');
      console.log('   按产量分摊必须有产量记录才能计算分摊系数\n');
      console.log('建议: 请先录入3月11日的产量数据');
    } else if (activeLines.length === 0) {
      console.log('❌ 主要原因: 3月11日没有参与分摊的产线');
      console.log('   需要至少有一条产线的 participateInAllocation = true\n');
    } else {
      console.log('可能的原因:');
      console.log('1. 分摊配置状态不是ACTIVE');
      console.log(`   当前状态: ${config.status}`);
      console.log('2. 规则状态不是ACTIVE');
      config.rules.forEach((rule, idx) => {
        console.log(`   规则${idx + 1}: ${rule.status}`);
      });
      console.log('3. 产线没有找到间接设备账户');
      console.log('   请确保产线有对应的间接设备账户');
    }
  } else {
    console.log('✓ 有分摊结果，请检查结果是否正确');
  }

  console.log('\n========================================');
}

checkYieldAllocation()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
