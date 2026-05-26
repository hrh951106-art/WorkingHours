const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkA03DateMismatch() {
  console.log('🔍 A03分摊规则 - 日期匹配问题诊断\n');
  console.log('═'.repeat(80));

  // 1. 检查工时数据的日期分布
  console.log('\n1️⃣ 工时数据日期分布:');

  const workHoursDates = await prisma.$queryRaw`
    SELECT "calcDate" as date, COUNT(*) as count,
           SUM("workHours") as totalHours
    FROM "WorkHourResult"
    WHERE "definitionAttendanceCodeStr" = 'A02_LINE'
      AND status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
    GROUP BY "calcDate"
    ORDER BY date DESC
  `;

  if (workHoursDates && workHoursDates.length > 0) {
    console.log(`  找到 ${workHoursDates.length} 个日期:\n`);
    workHoursDates.forEach(d => {
      if (d.date) {
        const dateStr = d.date.toISOString().split('T')[0];
        console.log(`    ${dateStr}: ${d.count}条记录, 共${d.totalHours}小时`);
      }
    });
  }

  // 2. 检查开线计划的日期分布
  console.log('\n2️⃣ 开线计划日期分布:');

  const lineShiftDates = await prisma.$queryRaw`
    SELECT "scheduleDate" as date, COUNT(*) as count
    FROM "LineShift"
    WHERE "deletedAt" IS NULL
      AND status = 'ACTIVE'
      AND "scheduleDate" IS NOT NULL
    GROUP BY "scheduleDate"
    ORDER BY date DESC
    LIMIT 10
  `;

  if (lineShiftDates && lineShiftDates.length > 0) {
    console.log(`  找到 ${lineShiftDates.length} 个日期:\n`);
    lineShiftDates.forEach(d => {
      if (d.date) {
        const dateStr = d.date.toISOString().split('T')[0];
        console.log(`    ${dateStr}: ${d.count}条记录`);
      }
    });
  }

  // 3. 对比日期
  console.log('\n3️⃣ 日期对比分析:');

  const workHourDates = new Set(workHoursDates.map(d => d.date.toISOString().split('T')[0]));
  const shiftDates = new Set(lineShiftDates.map(d => d.date.toISOString().split('T')[0]));

  console.log(`  工时数据日期: ${Array.from(workHourDates).join(', ')}`);
  console.log(`  开线计划日期: ${Array.from(shiftDates).join(', ')}`);

  const commonDates = Array.from(workHourDates).filter(d => shiftDates.has(d));

  if (commonDates.length > 0) {
    console.log(`\n  ✅ 共同日期: ${commonDates.join(', ')}`);
  } else {
    console.log(`\n  ❌ 没有共同的日期！`);
    console.log(`  ⚠️  这是导致无法分摊的主要原因！`);
  }

  // 4. 详细检查5月12日的数据
  console.log('\n4️⃣ 5月12日工时数据详情:');

  const may12WorkHours = await prisma.$queryRaw`
    SELECT "id", "calcDate", "employeeId", "definitionAttendanceCodeStr",
           "workHours", "accountId", "accountName", "status"
    FROM "WorkHourResult"
    WHERE "definitionAttendanceCodeStr" = 'A02_LINE'
      AND "calcDate" >= '2026-05-12'
      AND "calcDate" < '2026-05-13'
      AND status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
  `;

  if (may12WorkHours && may12WorkHours.length > 0) {
    console.log(`  找到 ${may12WorkHours.length} 条5月12日的工时记录:\n`);
    may12WorkHours.forEach((wh, idx) => {
      const dateStr = wh.calcDate.toISOString().split('T')[0];
      console.log(`    ${idx + 1}. ${dateStr} | 员工ID=${wh.employeeId} | ${wh.workHours}h | 账户=${wh.accountName || '(无)'}`);
    });
  }

  // 5. 检查5月12日的开线计划
  console.log('\n5️⃣ 5月12日的开线计划:');

  const may12LineShifts = await prisma.$queryRaw`
    SELECT "id", "scheduleDate", "shiftId", "shiftName", "accountId", "accountName",
           "orgId", "orgName", "participateInAllocation"
    FROM "LineShift"
    WHERE "scheduleDate" >= '2026-05-12'
      AND "scheduleDate" < '2026-05-13'
      AND "deletedAt" IS NULL
      AND status = 'ACTIVE'
  `;

  if (may12LineShifts && may12LineShifts.length > 0) {
    console.log(`  找到 ${may12LineShifts.length} 条5月12日的开线计划:\n`);
    may12LineShifts.forEach((ls, idx) => {
      const dateStr = ls.scheduleDate.toISOString().split('T')[0];
      console.log(`    ${idx + 1}. ${dateStr} | ${ls.shiftName} | 账户=${ls.accountName || '(无)'} | 组织=${ls.orgName || '(无)'} | 参与分摊=${ls.participateInAllocation}`);
    });
  } else {
    console.log(`  ❌ 5月12日没有开线计划数据！`);
  }

  // 6. 车间匹配分析
  console.log('\n6️⃣ 车间匹配分析:');

  // 从工时数据提取车间
  const workshopsInWorkHours = new Set();
  may12WorkHours.forEach(wh => {
    if (wh.accountName) {
      const parts = wh.accountName.split('/');
      if (parts[1]) {
        workshopsInWorkHours.add(parts[1]);
      }
    }
  });

  console.log(`  工时数据中的车间: ${Array.from(workshopsInWorkHours).join(', ')}`);

  // 从开线计划提取车间（使用5月12日的数据，如果没有就用最近的）
  const shiftsToCheck = may12LineShifts.length > 0 ? may12LineShifts :
    await prisma.$queryRaw`
      SELECT "accountName", "orgName"
      FROM "LineShift"
      WHERE "deletedAt" IS NULL
        AND status = 'ACTIVE'
      LIMIT 5
    `;

  const workshopsInLineShifts = new Set();
  shiftsToCheck.forEach(ls => {
    if (ls.accountName) {
      const parts = ls.accountName.split('/');
      if (parts[1]) {
        workshopsInLineShifts.add(parts[1]);
      }
    }
  });

  console.log(`  开线计划中的车间: ${Array.from(workshopsInLineShifts).join(', ')}`);

  const commonWorkshops = Array.from(workshopsInWorkHours).filter(w => workshopsInLineShifts.has(w));
  console.log(`  共同的车间: ${commonWorkshops.length > 0 ? commonWorkshops.join(', ') : '(无)'}`);

  // 7. 问题总结
  console.log('\n7️⃣ 问题总结:');
  console.log('═'.repeat(80));

  const issues = [];

  if (commonDates.length === 0) {
    issues.push('❌ 【主要问题】工时数据日期和开线计划日期不匹配');
    issues.push(`   工时数据日期: ${Array.from(workHourDates).join(', ')}`);
    issues.push(`   开线计划日期: ${Array.from(shiftDates).join(', ')}`);
    issues.push('   建议：确保开线计划的日期与工时数据的日期一致');
  }

  if (may12LineShifts.length === 0) {
    issues.push('❌ 【次要问题】5月12日没有开线计划数据');
    issues.push('   即使有工时数据，也无法找到对应的分摊目标');
  }

  if (commonWorkshops.length === 0) {
    issues.push('⚠️  【潜在问题】工时数据和开线计划的车间不匹配');
  }

  if (issues.length > 0) {
    console.log('  发现的问题:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('  ✅ 日期和车间匹配正常');
  }

  // 8. 解决方案
  console.log('\n8️⃣ 解决方案:');

  if (commonDates.length === 0) {
    console.log('  1. 【创建开线计划】为工时数据的日期创建开线计划');
    console.log(`     具体日期: ${Array.from(workHourDates).join(', ')}`);
    console.log('\n  2. 【调整日期范围】如果应该使用5月14日的计划，需要：');
    console.log('     a) 重新计算工时，使calcDate=2026-05-14');
    console.log('     b) 或者，将开线计划的scheduleDate改为2026-05-12');
    console.log('\n  3. 【推荐方案】创建5月12日的开线计划：');
    console.log('     进入：生产管理 → 开线维护');
    console.log('     选择日期：2026-05-12');
    console.log('     添加产线：W1总装车间L1产线、W1总装车间L2产线');
    console.log('     设置班次：一段班');
    console.log('     标记为"参与分摊"');
  }

  await prisma.$disconnect();
}

checkA03DateMismatch().catch(console.error);
