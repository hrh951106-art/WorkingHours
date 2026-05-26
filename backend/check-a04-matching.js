const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkA04Matching() {
  console.log('🔍 A04分摊规则 - 数据匹配分析\n');
  console.log('═'.repeat(80));

  const targetDate = '2026-05-14';
  const attendanceCode = 'A04_WORKSHOP';
  const scopeLevel = 2; // 车间级别

  // 1. 检查工时数据
  console.log('\n1️⃣ 2026-05-14的工时数据:');

  const workHours = await prisma.$queryRaw`
    SELECT "id", "calcDate", "employeeId", "definitionAttendanceCodeStr",
           "workHours", "accountId", "accountName"
    FROM "WorkHourResult"
    WHERE "definitionAttendanceCodeStr" = ${attendanceCode}
      AND DATE("calcDate") = ${targetDate}
      AND status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
  `;

  if (workHours && workHours.length > 0) {
    console.log(`  找到 ${workHours.length} 条工时记录:\n`);

    workHours.forEach((wh, idx) => {
      const dateStr = wh.calcDate ? wh.calcDate.toISOString().split('T')[0] : '(无日期)';
      console.log(`  ${idx + 1}. ${dateStr} | 员工ID=${wh.employeeId} | ${wh.workHours}h`);
      console.log(`     账户: ${wh.accountName || '(无)'}`);

      // 解析层级
      if (wh.accountName) {
        const parts = wh.accountName.split('/');
        console.log(`     层级1(工厂): ${parts[0] || '(无)'}`);
        console.log(`     层级2(车间): ${parts[1] || '(无)'}`);
        console.log(`     层级3(产线): ${parts[2] || '(无)'}`);
      }
      console.log('');
    });
  } else {
    console.log('  ❌ 没有工时数据');
    await prisma.$disconnect();
    return;
  }

  // 2. 检查开线计划
  console.log('2️⃣ 2026-05-14的开线计划:');

  const lineShifts = await prisma.$queryRaw`
    SELECT "id", "scheduleDate", "shiftId", "shiftName", "accountId", "accountName",
           "orgId", "orgName", "participateInAllocation"
    FROM "LineShift"
    WHERE DATE("scheduleDate") = ${targetDate}
      AND "deletedAt" IS NULL
      AND status = 'ACTIVE'
  `;

  if (lineShifts && lineShifts.length > 0) {
    console.log(`  找到 ${lineShifts.length} 条开线计划:\n`);

    lineShifts.forEach((ls, idx) => {
      const dateStr = ls.scheduleDate ? ls.scheduleDate.toISOString().split('T')[0] : '(无日期)';
      console.log(`  ${idx + 1}. ${dateStr} | 班次=${ls.shiftName} | 参与分摊=${ls.participateInAllocation}`);
      console.log(`     账户: ${ls.accountName || '(无)'}`);
      console.log(`     组织: ${ls.orgName || '(无)'}`);

      // 解析层级
      if (ls.accountName) {
        const parts = ls.accountName.split('/');
        console.log(`     层级1(工厂): ${parts[0] || '(无)'}`);
        console.log(`     层级2(车间): ${parts[1] || '(无)'}`);
        console.log(`     层级3(产线): ${parts[2] || '(无)'}`);
      }
      console.log('');
    });
  } else {
    console.log('  ❌ 没有开线计划数据');
    await prisma.$disconnect();
    return;
  }

  // 3. 分析分摊范围匹配
  console.log('3️⃣ 分摊范围匹配分析（车间级别）:');

  // 提取工时数据中的车间
  const workshopsInWorkHours = new Set();
  workHours.forEach(wh => {
    if (wh.accountName) {
      const parts = wh.accountName.split('/');
      if (parts[1] && parts[1] !== '-') {
        workshopsInWorkHours.add(parts[1]);
      }
    }
  });

  console.log(`  工时数据中的车间: ${Array.from(workshopsInWorkHours).join(', ')}`);

  // 提取开线计划中的车间
  const workshopsInLineShifts = new Set();
  lineShifts.forEach(ls => {
    if (ls.accountName) {
      const parts = ls.accountName.split('/');
      if (parts[1] && parts[1] !== '-') {
        workshopsInLineShifts.add(parts[1]);
      }
    }
  });

  console.log(`  开线计划中的车间: ${Array.from(workshopsInLineShifts).join(', ')}`);

  const commonWorkshops = Array.from(workshopsInWorkHours).filter(w => workshopsInLineShifts.has(w));
  console.log(`  共同的车间: ${commonWorkshops.length > 0 ? commonWorkshops.join(', ') : '(无)'}`);

  // 4. 检查每个车间的匹配情况
  console.log('\n4️⃣ 详细车间匹配情况:');

  commonWorkshops.forEach(workshop => {
    console.log(`\n  【${workshop}】匹配分析:`);

    // 找到该车间下的工时数据
    const workshopWorkHours = workHours.filter(wh => {
      if (!wh.accountName) return false;
      const parts = wh.accountName.split('/');
      return parts[1] === workshop;
    });

    console.log(`    工时数据: ${workshopWorkHours.length}条`);
    workshopWorkHours.forEach(wh => {
      console.log(`      - ${wh.workHours}h | ${wh.accountName}`);
    });

    // 找到该车间下的开线计划
    const workshopLineShifts = lineShifts.filter(ls => {
      if (!ls.accountName) return false;
      const parts = ls.accountName.split('/');
      return parts[1] === workshop;
    });

    console.log(`    开线计划: ${workshopLineShifts.length}条`);
    workshopLineShifts.forEach(ls => {
      console.log(`      - ${ls.shiftName} | ${ls.orgName} | 参与分摊=${ls.participateInAllocation}`);
    });

    // 检查是否有参与分摊的产线
    const participatingShifts = workshopLineShifts.filter(ls => ls.participateInAllocation === true);
    console.log(`    参与分摊的产线: ${participatingShifts.length}条`);

    if (participatingShifts.length === 0) {
      console.log(`    ⚠️  该车间下没有标记为"参与分摊"的产线！`);
    }
  });

  // 5. 检查账户筛选
  console.log('\n5️⃣ 账户筛选分析:');

  const sourceConfigRaw = await prisma.$queryRaw`
    SELECT "accountFilter"
    FROM "AllocationSourceConfig"
    WHERE "configId" = 4
  `;

  if (sourceConfigRaw && sourceConfigRaw.length > 0) {
    const sourceConfig = sourceConfigRaw[0];
    if (sourceConfig.accountFilter) {
      const accountFilter = typeof sourceConfig.accountFilter === 'string'
        ? JSON.parse(sourceConfig.accountFilter)
        : sourceConfig.accountFilter;

      console.log(`  账户筛选配置:`);
      accountFilter.hierarchySelections.forEach(sel => {
        console.log(`    - level=${sel.level}, ${sel.levelName}, ${sel.valueIds.length}个值: ${sel.valueIds.join(', ')}`);
      });

      // 检查是否过滤掉了所有数据
      const filterLevel = accountFilter.hierarchySelections[0]?.level;
      const filterValues = accountFilter.hierarchySelections[0]?.valueIds || [];

      console.log(`\n  检查工时数据是否匹配筛选条件:`);

      workHours.forEach(wh => {
        if (!wh.accountName) return;
        const parts = wh.accountName.split('/');
        const levelValue = parts[filterLevel - 1]; // level=1对应parts[0]

        const isMatch = filterValues.includes(levelValue);
        console.log(`    ${wh.accountName}`);
        console.log(`      层级${filterLevel}: ${levelValue} ${isMatch ? '✅匹配' : '❌不匹配'}`);
      });
    }
  }

  // 6. 问题诊断
  console.log('\n6️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  const issues = [];

  if (commonWorkshops.length === 0) {
    issues.push('❌ 【主要问题】工时数据和开线计划的车间不匹配');
  }

  const participatingCount = lineShifts.filter(ls => ls.participateInAllocation === true).length;
  if (participatingCount === 0) {
    issues.push('❌ 【主要问题】没有标记为"参与分摊"的开线计划');
  }

  if (issues.length > 0) {
    console.log('  发现的问题:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('  ✅ 配置和数据匹配正常');
    console.log('  ⚠️  但没有分摊结果，可能是以下原因:');
    console.log('     1. 分摊计算逻辑问题（需要查看后端日志）');
    console.log('     2. 分摊计算尚未执行');
    console.log('     3. 账户筛选过滤掉了数据');
  }

  // 7. 解决方案
  console.log('\n7️⃣ 解决方案:');

  if (participatingCount === 0) {
    console.log('  1. 【标记产线为参与分摊】');
    console.log('     进入：生产管理 → 开线维护');
    console.log(`     选择日期：${targetDate}`);
    console.log('     将产线标记为"参与分摊"');
  }

  if (commonWorkshops.length === 0) {
    console.log('\n  2. 【确保车间匹配】');
    console.log(`     工时数据车间: ${Array.from(workshopsInWorkHours).join(', ')}`);
    console.log(`     开线计划车间: ${Array.from(workshopsInLineShifts).join(', ')}`);
    console.log('     需要确保两者有共同的车间');
  }

  await prisma.$disconnect();
}

checkA04Matching().catch(console.error);
