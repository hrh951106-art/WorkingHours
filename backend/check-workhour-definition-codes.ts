import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkHourResultDefinitionCodes() {
  console.log('=== WorkHourResult表的definitionAttendanceCodeId字段分析 ===\n');

  // 1. 检查WorkHourResult表结构和数据
  console.log('1. 检查WorkHourResult表的基本数据:');
  const workHourResults = await prisma.workHourResult.findMany({
    orderBy: { calcDate: 'desc' },
    take: 10,
    include: { employee: true }
  });

  console.log(`  总记录数: ${await prisma.workHourResult.count()}`);
  console.log(`  最近的10条记录:`);

  if (workHourResults.length === 0) {
    console.log('  ❌ WorkHourResult表为空');
  } else {
    workHourResults.forEach((result, index) => {
      console.log(`\n  [${index + 1}] 员工: ${result.employeeNo} - ${result.employee?.name}`);
      console.log(`     计算日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`     definitionAttendanceCodeId: ${result.definitionAttendanceCodeId || 'NULL'}`);
      console.log(`     definitionAttendanceCodeStr: ${result.definitionAttendanceCodeStr || 'NULL'}`);
      console.log(`     工时: ${result.workHours}`);
    });
  }

  // 2. 检查definitionAttendanceCodeId字段的分布
  console.log('\n2. definitionAttendanceCodeId字段分布:');
  const codeDistribution = await prisma.$queryRawUnsafe<Array<{definitionAttendanceCodeId: number | null, count: number}>>(`
    SELECT definitionAttendanceCodeId, COUNT(*) as count
    FROM WorkHourResult
    GROUP BY definitionAttendanceCodeId
    ORDER BY count DESC
  `);

  if (codeDistribution.length === 0) {
    console.log('  ❌ 没有数据');
  } else {
    codeDistribution.forEach(dist => {
      const codeId = dist.definitionAttendanceCodeId;
      if (codeId === null) {
        console.log(`  NULL: ${dist.count} 条`);
      } else {
        console.log(`  ID=${codeId}: ${dist.count} 条`);
      }
    });
  }

  // 3. 检查A05规则配置的DefinitionAttendanceCode
  console.log('\n3. 检查A05规则配置的DefinitionAttendanceCode:');
  const a05Config = await prisma.allocationConfig.findFirst({
    where: { configCode: 'A05', deletedAt: null },
    include: { rules: true }
  });

  if (!a05Config) {
    console.log('  ❌ 没有找到A05配置');
    return;
  }

  const rule = a05Config.rules[0];
  console.log(`  规则ID: ${rule.id}`);
  console.log(`  规则名称: ${rule.ruleName}`);
  console.log(`  allocationAttendanceCodes字段: "${rule.allocationAttendanceCodes}"`);

  // 解析配置的ID
  try {
    const configuredIds = JSON.parse(rule.allocationAttendanceCodes || '[]');
    console.log(`  配置的DefinitionAttendanceCode ID: ${configuredIds.length > 0 ? configuredIds.join(', ') : '空'}`);

    if (configuredIds.length > 0) {
      console.log('\n  配置的DefinitionAttendanceCode详情:');
      for (const id of configuredIds) {
        const defCode = await prisma.definitionAttendanceCode.findUnique({
          where: { id }
        });
        if (defCode) {
          console.log(`    ID=${id}: ${defCode.attendanceCode} - ${defCode.displayName}`);
        } else {
          console.log(`    ID=${id}: ❌ 不存在`);
        }
      }
    }
  } catch (e) {
    console.log('  ❌ JSON解析失败');
  }

  // 4. 检查WorkHourResult中是否有符合A05规则的数据
  console.log('\n4. 检查WorkHourResult中符合A05规则的数据:');
  const configuredIds = JSON.parse(rule?.allocationAttendanceCodes || '[]');

  let whereClause: any = {};
  if (configuredIds.length > 0) {
    whereClause.definitionAttendanceCodeId = { in: configuredIds };
  }

  const matchingResults = await prisma.workHourResult.findMany({
    where: whereClause,
    orderBy: { calcDate: 'desc' },
    take: 10,
    include: { employee: true }
  });

  console.log(`  找到 ${matchingResults.length} 条符合规则的数据`);

  if (matchingResults.length > 0) {
    matchingResults.slice(0, 5).forEach((result, index) => {
      console.log(`\n  [${index + 1}] ${result.employeeNo} - ${result.employee?.name}`);
      console.log(`     日期: ${result.calcDate ? result.calcDate.toISOString().split('T')[0] : 'NULL'}`);
      console.log(`     definitionAttendanceCodeId: ${result.definitionAttendanceCodeId}`);
      console.log(`     definitionAttendanceCodeStr: ${result.definitionAttendanceCodeStr}`);
      console.log(`     工时: ${result.workHours}`);
    });
  }

  // 5. 对比：如果规则配置了A04_WORKSHOP (id=9)
  console.log('\n5. 检查A04_WORKSHOP (id=9) 的WorkHourResult数据:');
  const a04WorkshopResults = await prisma.workHourResult.findMany({
    where: { definitionAttendanceCodeId: 9 },
    orderBy: { calcDate: 'desc' },
    take: 5,
    include: { employee: true }
  });

  console.log(`  找到 ${a04WorkshopResults.length} 条数据`);

  if (a04WorkshopResults.length > 0) {
    a04WorkshopResults.forEach((result, index) => {
      console.log(`\n  [${index + 1}] ${result.employeeNo} - ${result.employee?.name}`);
      console.log(`     日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`     工时: ${result.workHours}`);
    });
  }

  // 6. 检查所有DefinitionAttendanceCode在WorkHourResult中的分布
  console.log('\n6. DefinitionAttendanceCode在WorkHourResult中的使用情况:');
  const allDefCodes = await prisma.definitionAttendanceCode.findMany({
    orderBy: { id: 'asc' }
  });

  for (const defCode of allDefCodes) {
    const count = await prisma.workHourResult.count({
      where: { definitionAttendanceCodeId: defCode.id }
    });
    console.log(`  ${defCode.attendanceCode} (ID=${defCode.id}): ${count} 条WorkHourResult记录`);
  }

  console.log('\n=== 检查完成 ===');
}

checkWorkHourResultDefinitionCodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
