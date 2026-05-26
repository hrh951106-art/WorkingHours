const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseA04() {
  console.log('🔍 A04分摊规则完整诊断\n');
  console.log('═'.repeat(80));

  // 1. 使用WorkHourResult模型查询
  console.log('\n1️⃣ 使用Prisma模型查询2026-05-14的工时数据:');

  const startDate = new Date('2026-05-14T00:00:00.000Z');
  const endDate = new Date('2026-05-14T23:59:59.999Z');

  const workHours = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeStr: 'A04_WORKSHOP',
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ['DRAFT', 'CONFIRMED', 'LOCKED'],
      },
    },
  });

  console.log(`  查询到 ${workHours.length} 条工时数据`);

  if (workHours.length > 0) {
    console.log('\n  工时数据详情:');
    workHours.forEach((wh, idx) => {
      const dateStr = wh.calcDate.toISOString().split('T')[0];
      console.log(`  ${idx + 1}. ${dateStr} | 员工ID=${wh.employeeId} | ${wh.workHours}h | ${wh.accountName}`);
    });

    // 2. 提取车间信息
    console.log('\n2️⃣ 提取车间信息:');

    const workshops = new Set();
    const lines = new Set();

    workHours.forEach(wh => {
      if (wh.accountName) {
        const parts = wh.accountName.split('/');
        if (parts[1]) workshops.add(parts[1]);
        if (parts[2]) lines.add(parts[2]);
      }
    });

    console.log(`  车间: ${Array.from(workshops).join(', ')}`);
    console.log(`  产线: ${Array.from(lines).join(', ')}`);

    // 3. 查询开线计划
    console.log('\n3️⃣ 查询2026-05-14的开线计划:');

    const lineShifts = await prisma.lineShift.findMany({
      where: {
        scheduleDate: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    console.log(`  查询到 ${lineShifts.length} 条开线计划`);

    if (lineShifts.length > 0) {
      console.log('\n  开线计划详情:');
      lineShifts.forEach((ls, idx) => {
        const dateStr = ls.scheduleDate.toISOString().split('T')[0];
        console.log(`  ${idx + 1}. ${dateStr} | ${ls.shiftName} | 参与分摊=${ls.participateInAllocation}`);
        console.log(`     账户: ${ls.accountName}`);
        console.log(`     组织: ${ls.orgName}`);

        if (ls.accountName) {
          const parts = ls.accountName.split('/');
          console.log(`     车间: ${parts[1] || '(无)'}`);
          console.log(`     产线: ${parts[2] || '(无)'}`);
        }
        console.log('');
      });

      // 4. 匹配分析
      console.log('4️⃣ 车间匹配分析:');

      const lineShiftWorkshops = new Set();
      lineShifts.forEach(ls => {
        if (ls.accountName) {
          const parts = ls.accountName.split('/');
          if (parts[1]) lineShiftWorkshops.add(parts[1]);
        }
      });

      const commonWorkshops = Array.from(workshops).filter(w => lineShiftWorkshops.has(w));

      console.log(`  工时数据车间: ${Array.from(workshops).join(', ')}`);
      console.log(`  开线计划车间: ${Array.from(lineShiftWorkshops).join(', ')}`);
      console.log(`  共同车间: ${commonWorkshops.length > 0 ? commonWorkshops.join(', ') : '(无)'}`);

      if (commonWorkshops.length > 0) {
        console.log('\n  ✅ 有共同的车间，可以执行分摊');

        commonWorkshops.forEach(workshop => {
          console.log(`\n  【${workshop}】详细分析:`);

          const workshopWorkHours = workHours.filter(wh => {
            if (!wh.accountName) return false;
            const parts = wh.accountName.split('/');
            return parts[1] === workshop;
          });

          const workshopLineShifts = lineShifts.filter(ls => {
            if (!ls.accountName) return false;
            const parts = ls.accountName.split('/');
            return parts[1] === workshop;
          });

          const participatingShifts = workshopLineShifts.filter(ls => ls.participateInAllocation === true);

          console.log(`    工时数据: ${workshopWorkHours.length}条, ${workshopWorkHours.reduce((sum, wh) => sum + wh.workHours, 0)}小时`);
          console.log(`    开线计划: ${workshopLineShifts.length}条`);
          console.log(`    参与分摊: ${participatingShifts.length}条`);

          if (participatingShifts.length === 0) {
            console.log(`    ⚠️  该车间下没有标记为"参与分摊"的产线`);
          } else {
            console.log(`    ✅ 该车间有${participatingShifts.length}条产线参与分摊`);
          }
        });
      } else {
        console.log('\n  ❌ 没有共同的车间，无法执行分摊');
      }

      // 5. 检查账户筛选
      console.log('\n5️⃣ 检查账户筛选:');

      const sourceConfig = await prisma.allocationSourceConfig.findFirst({
        where: {
          configId: 4,
        },
      });

      if (sourceConfig && sourceConfig.accountFilter) {
        const accountFilter = typeof sourceConfig.accountFilter === 'string'
          ? JSON.parse(sourceConfig.accountFilter)
          : sourceConfig.accountFilter;

        if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
          console.log('  账户筛选配置:');
          accountFilter.hierarchySelections.forEach(sel => {
            console.log(`    level=${sel.level}, ${sel.levelName}, 值: ${sel.valueIds.join(', ')}`);
          });

          // 检查工时数据是否被过滤
          const filterLevel = accountFilter.hierarchySelections[0].level;
          const filterValues = accountFilter.hierarchySelections[0].valueIds;

          console.log(`\n  检查工时数据是否被过滤:`);

          workHours.forEach(wh => {
            if (!wh.accountName) return;
            const parts = wh.accountName.split('/');
            const levelValue = parts[filterLevel - 1];
            const isMatch = filterValues.includes(levelValue);

            console.log(`    ${wh.accountName}`);
            console.log(`      level=${filterLevel}: ${levelValue} ${isMatch ? '✅' : '❌'}`);
          });
        }
      }
    } else {
      console.log('  ❌ 该日期没有开线计划数据');
      console.log('  ⚠️  即使有工时数据，也无法找到分摊目标');
    }

    // 6. 总结
    console.log('\n6️⃣ 诊断总结:');
    console.log('═'.repeat(80));

    const participatingShifts = lineShifts.filter(ls => ls.participateInAllocation === true);

    if (workHours.length > 0 && lineShifts.length > 0) {
      if (participatingShifts.length === 0) {
        console.log('  ❌ 【主要问题】没有标记为"参与分摊"的产线');
        console.log('  解决方案: 进入开线维护，将产线标记为"参与分摊"');
      } else {
        console.log('  ✅ 数据完整，应该可以执行分摊计算');
        console.log('  如果没有结果，请检查:');
        console.log('  1. 是否执行过分摊计算');
        console.log('  2. 分摊计算的执行日志');
        console.log('  3. 账户筛选是否过滤掉了所有数据');
      }
    } else if (workHours.length === 0) {
      console.log('  ❌ 【主要问题】没有工时数据');
    } else if (lineShifts.length === 0) {
      console.log('  ❌ 【主要问题】没有开线计划数据');
    }

  } else {
    console.log('  ❌ 该日期没有工时数据');
    console.log('  建议：检查其他日期或创建新的工时数据');
  }

  await prisma.$disconnect();
}

diagnoseA04().catch(console.error);
