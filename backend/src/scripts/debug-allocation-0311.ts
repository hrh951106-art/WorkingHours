import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_DATE = '2026-03-11';

async function debugAllocationData() {
  console.log('========================================');
  console.log(`排查日期: ${TARGET_DATE} 的分摊数据`);
  console.log('========================================\n');

  const calcDate = new Date(TARGET_DATE);

  // 1. 检查产线开线计划
  console.log('1. 检查产线开线计划 (LineShift)');
  console.log('--------------------------------------');
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

  console.log(`总计开线数量: ${lineShifts.length}`);
  console.log(`参与分摊的产线数量: ${lineShifts.filter(ls => ls.participateInAllocation).length}`);

  if (lineShifts.length === 0) {
    console.log('❌ 问题: 当天没有任何产线开线记录！');
  } else {
    lineShifts.forEach(ls => {
      console.log(`  - 产线: ${ls.line?.name || 'N/A'}, 班次: ${ls.shiftName || 'N/A'}, 参与分摊: ${ls.participateInAllocation ? '是' : '否'}`);
    });
  }
  console.log();

  // 2. 检查通用配置
  console.log('2. 检查通用配置 (AllocationGeneralConfig)');
  console.log('--------------------------------------');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();

  if (!generalConfig) {
    console.log('❌ 问题: 未配置通用配置！');
  } else {
    console.log(`直接工时代码: ${generalConfig.actualHoursAllocationCode || '未配置'}`);
    console.log(`间接工时代码: ${generalConfig.indirectHoursAllocationCode || '未配置'}`);

    // 检查出勤代码是否存在
    if (generalConfig.actualHoursAllocationCode) {
      const actualHoursCode = await prisma.attendanceCode.findUnique({
        where: { code: generalConfig.actualHoursAllocationCode },
      });
      if (!actualHoursCode) {
        console.log(`❌ 问题: 直接工时出勤代码 "${generalConfig.actualHoursAllocationCode}" 不存在！`);
      } else {
        console.log(`  直接工时出勤代码ID: ${actualHoursCode.id}`);
      }
    }

    if (generalConfig.indirectHoursAllocationCode) {
      const indirectHoursCode = await prisma.attendanceCode.findUnique({
        where: { code: generalConfig.indirectHoursAllocationCode },
      });
      if (!indirectHoursCode) {
        console.log(`❌ 问题: 间接工时出勤代码 "${generalConfig.indirectHoursAllocationCode}" 不存在！`);
      } else {
        console.log(`  间接工时出勤代码ID: ${indirectHoursCode.id}`);
      }
    }
  }
  console.log();

  // 3. 检查直接工时数据
  console.log('3. 检查直接工时数据 (CalcResult - 实际工时)');
  console.log('--------------------------------------');
  const actualHoursCode = generalConfig?.actualHoursAllocationCode
    ? await prisma.attendanceCode.findUnique({
        where: { code: generalConfig.actualHoursAllocationCode },
      })
    : null;

  if (actualHoursCode) {
    const directResults = await prisma.calcResult.findMany({
      where: {
        calcDate,
        attendanceCodeId: actualHoursCode.id,
      },
      include: {
        employee: true,
      },
    });

    console.log(`直接工时记录数: ${directResults.length}`);
    if (directResults.length > 0) {
      const totalHours = directResults.reduce((sum, r) => sum + r.actualHours, 0);
      console.log(`总直接工时: ${totalHours} 小时`);

      // 显示前5条记录
      directResults.slice(0, 5).forEach(r => {
        console.log(`  - ${r.employeeNo} ${r.employee?.name || ''}: ${r.actualHours}小时 (班次ID: ${r.shiftId})`);
      });
      if (directResults.length > 5) {
        console.log(`  ... 还有 ${directResults.length - 5} 条记录`);
      }
    } else {
      console.log('⚠️  警告: 当天没有直接工时数据！');
    }
  } else {
    console.log('❌ 无法查询直接工时：未配置直接工时代码');
  }
  console.log();

  // 4. 按产线汇总直接工时
  console.log('4. 按产线汇总直接工时');
  console.log('--------------------------------------');
  if (actualHoursCode && lineShifts.length > 0) {
    const directResults = await prisma.calcResult.findMany({
      where: {
        calcDate,
        attendanceCodeId: actualHoursCode.id,
      },
    });

    const shiftToLineMap: Record<number, number> = {};
    lineShifts.forEach(ls => {
      if (ls.lineId && ls.line) {
        shiftToLineMap[ls.shiftId] = ls.line.id;
      }
    });

    const directHoursByLine: Record<number, { name: string; hours: number }> = {};
    directResults.forEach(result => {
      const lineId = shiftToLineMap[result.shiftId];
      if (lineId) {
        if (!directHoursByLine[lineId]) {
          const line = lineShifts.find(ls => ls.lineId === lineId)?.line;
          directHoursByLine[lineId] = { name: line?.name || 'Unknown', hours: 0 };
        }
        directHoursByLine[lineId].hours += result.actualHours;
      }
    });

    const lineEntries = Object.entries(directHoursByLine);
    console.log(`有直接工时的产线数: ${lineEntries.length}`);
    lineEntries.forEach(([lineId, data]) => {
      console.log(`  - 产线ID ${lineId} (${data.name}): ${data.hours} 小时`);
    });

    if (lineEntries.length === 0) {
      console.log('❌ 问题: 没有任何产线有直接工时数据！');
      console.log('   可能原因: 直接工时记录的班次ID与产线班次的班次ID不匹配');
    }
  }
  console.log();

  // 5. 检查分摊配置
  console.log('5. 检查分摊配置 (AllocationConfig)');
  console.log('--------------------------------------');
  const configs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
    },
    include: {
      sourceConfig: true,
      rules: {
        where: { deletedAt: null, status: 'ACTIVE' },
        include: {
          targets: true,
        },
      },
    },
  });

  console.log(`活跃的分摊配置数量: ${configs.length}`);
  if (configs.length === 0) {
    console.log('❌ 问题: 没有活跃的分摊配置！');
  } else {
    configs.forEach(config => {
      console.log(`\n配置: ${config.configName} (ID: ${config.id})`);
      console.log(`  版本: ${config.version}`);
      console.log(`  分摊源配置ID: ${config.sourceConfig?.id || 'N/A'}`);

      config.rules.forEach(rule => {
        console.log(`  规则: ${rule.ruleName} (ID: ${rule.id})`);
        console.log(`    分摊依据: ${rule.allocationBasis}`);
        console.log(`    目标数量: ${rule.targets.length}`);
      });
    });
  }
  console.log();

  // 6. 检查待分摊的工时记录
  console.log('6. 检查待分摊工时记录');
  console.log('--------------------------------------');
  if (configs.length > 0 && configs[0].sourceConfig) {
    const sourceConfig = configs[0].sourceConfig;
    const attendanceCodes = JSON.parse(sourceConfig.attendanceCodes || '[]');

    console.log(`分摊源出勤代码: ${attendanceCodes.join(', ')}`);

    const attendanceCodeMap = await prisma.attendanceCode.findMany({
      where: { code: { in: attendanceCodes } },
    });

    if (attendanceCodeMap.length === 0) {
      console.log('❌ 问题: 分摊源配置的出勤代码都不存在！');
    } else {
      const calcResults = await prisma.calcResult.findMany({
        where: {
          calcDate,
          attendanceCodeId: { in: attendanceCodeMap.map(ac => ac.id) },
        },
        include: {
          employee: true,
        },
      });

      console.log(`待分摊工时记录数: ${calcResults.length}`);
      if (calcResults.length === 0) {
        console.log('❌ 问题: 当天没有待分摊的工时记录！');
      } else {
        const totalHours = calcResults.reduce((sum, r) => sum + r.actualHours, 0);
        console.log(`总待分摊工时: ${totalHours} 小时`);

        // 显示前5条记录
        calcResults.slice(0, 5).forEach(r => {
          console.log(`  - ${r.employeeNo} ${r.employee?.name || ''}: ${r.actualHours}小时 (班次ID: ${r.shiftId})`);
        });
        if (calcResults.length > 5) {
          console.log(`  ... 还有 ${calcResults.length - 5} 条记录`);
        }

        // 检查这些员工是否有排班
        console.log('\n检查待分摊工时员工的排班情况:');
        for (const result of calcResults.slice(0, 5)) {
          const schedule = await prisma.schedule.findFirst({
            where: {
              employeeId: result.employee.id,
              scheduleDate: calcDate,
            },
            include: {
              shift: true,
            },
          });

          if (!schedule) {
            console.log(`  ❌ ${result.employeeNo} ${result.employee?.name || ''}: 没有排班记录`);
          } else {
            console.log(`  ✓ ${result.employeeNo} ${result.employee?.name || ''}: 班次 ${schedule.shift?.name || 'N/A'} (ID: ${schedule.shiftId})`);
          }
        }
      }
    }
  }
  console.log();

  // 7. 检查排班与开线的匹配
  console.log('7. 检查排班与开线的匹配');
  console.log('--------------------------------------');
  const activeShifts = lineShifts.map(ls => ls.shiftId);
  console.log(`开线的班次ID: ${activeShifts.join(', ') || '无'}`);

  if (activeShifts.length > 0 && actualHoursCode) {
    const employeesWithoutShiftLine = await prisma.$queryRaw`
      SELECT DISTINCT cr.employeeNo, e.name, cr.shiftId
      FROM CalcResult cr
      LEFT JOIN Employee e ON cr.employeeId = e.id
      WHERE cr.calcDate = ${calcDate}
        AND cr.attendanceCodeId = ${actualHoursCode.id}
        AND cr.shiftId NOT IN (${activeShifts.join(',')})
    `;

    if (Array.isArray(employeesWithoutShiftLine) && employeesWithoutShiftLine.length > 0) {
      console.log(`\n⚠️  发现有 ${employeesWithoutShiftLine.length} 个员工的班次没有对应的产线开线记录:`);
      employeesWithoutShiftLine.slice(0, 5).forEach((emp: any) => {
        console.log(`  - ${emp.employeeNo} ${emp.name || ''}: 班次ID ${emp.shiftId}`);
      });
    }
  }
  console.log();

  // 8. 检查分摊结果
  console.log('8. 检查分摊结果 (AllocationResult)');
  console.log('--------------------------------------');
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      recordDate: calcDate,
    },
  });

  console.log(`分摊结果记录数: ${allocationResults.length}`);
  if (allocationResults.length === 0) {
    console.log('❌ 确认问题: 当天没有任何分摊结果！');
  } else {
    const totalAllocatedHours = allocationResults.reduce((sum, r) => sum + r.allocatedHours, 0);
    console.log(`总分摊工时: ${totalAllocatedHours} 小时`);
    console.log(`涉及批次: ${[...new Set(allocationResults.map(r => r.batchNo))].join(', ')}`);
  }
  console.log();

  console.log('========================================');
  console.log('排查完成');
  console.log('========================================');
}

debugAllocationData()
  .catch((e) => {
    console.error('排查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
