import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== A01 分摊问题排查 ==========\n');

  // 1. 获取A01配置
  const config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: { code: 'A01' }
  });

  if (!config) {
    console.log('❌ 未找到A01配置');
    return;
  }

  console.log('【配置信息】');
  console.log(`ID: ${config.id}`);
  console.log(`状态: ${config.status}`);
  console.log(`生效时间: ${config.effectiveStartTime}\n`);

  const sourceConfig = JSON.parse(config.sourceConfig || '{}');
  const rules = JSON.parse(config.rules || '[]');

  console.log(`考勤代码: ${JSON.stringify(sourceConfig.attendanceCodes)}`);
  console.log(`账户筛选: ${JSON.stringify(sourceConfig.accountFilter?.hierarchySelections)}\n`);

  // 2. 检查5月19日的数据
  console.log('【5月19日数据】');

  // 生产记录
  const prodRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  if (prodRecord) {
    console.log(`✅ 生产记录: ${prodRecord.productName}, 数量: ${prodRecord.actualQty}, 组织ID: ${prodRecord.orgId}\n`);
  } else {
    console.log('❌ 没有生产记录\n');
    return;
  }

  // 工时结果
  const workHours = await prisma.workHourResult.findMany({
    where: {
      calcDate: new Date('2026-05-19'),
      attendanceCode: { in: sourceConfig.attendanceCodes || [] }
    }
  });

  console.log(`工时结果数量: ${workHours.length}`);
  if (workHours.length > 0) {
    console.log(`总工时: ${workHours.reduce((sum, wh) => sum + (wh.workHours || 0), 0).toFixed(2)}\n`);

    // 显示账户路径
    console.log('账户路径列表:');
    const paths = new Set(workHours.map(wh => wh.accountPath));
    for (const path of paths) {
      console.log(`  - ${path}`);
    }
  } else {
    console.log('❌ 没有工时结果\n');
  }

  // 3. 检查分摊结果
  console.log('【分摊结果】');
  const allocResults = await prisma.earnedHoursAllocationResult.findMany({
    where: {
      configId: config.id,
      recordDate: new Date('2026-05-19')
    }
  });

  console.log(`分摊结果数量: ${allocResults.length}\n`);

  // 4. 分析问题
  console.log('【问题分析】');

  if (prodRecord && workHours.length > 0 && allocResults.length === 0) {
    console.log('✅ 有生产记录');
    console.log('✅ 有工时结果');
    console.log('❌ 没有分摊结果');
    console.log('\n可能原因:');

    // 检查账户筛选条件
    if (sourceConfig.accountFilter?.hierarchySelections) {
      console.log('\n1. 账户筛选条件:');
      for (const selection of sourceConfig.accountFilter.hierarchySelections) {
        console.log(`   层级${selection.level} (${selection.levelName}): valueIds = ${JSON.stringify(selection.valueIds)}`);
      }

      // 检查工时结果中的账户是否满足筛选条件
      console.log('\n2. 检查工时结果账户是否满足筛选条件:');
      const config = await prisma.accountHierarchyConfig.findFirst({
        where: { level: 1, status: 'ACTIVE' }
      });

      if (config) {
        console.log(`   工厂层级配置ID: ${config.id}`);
        console.log(`   筛选要求: 工厂层级 = SZ`);

        // 获取工时结果中所有员工的账户路径
        const employeeNos = [...new Set(workHours.map(wh => wh.employeeNo))];
        const accounts = await prisma.laborAccount.findMany({
          where: {
            employeeId: { in: await prisma.employee.findMany({
              where: { employeeNo: { in: employeeNos } },
              select: { id: true }
            }).then(e => e.map(emp => emp.id)) },
            type: 'MAIN'
          }
        });

        console.log(`   找到 ${accounts.length} 个主账户:`);

        let matchingCount = 0;
        for (const acc of accounts) {
          const hierarchyValues = JSON.parse(acc.hierarchyValues || '[]');
          const level1Value = hierarchyValues.find((hv: any) => hv.level === 1);
          const level1Code = level1Value?.selectedValue?.code;

          const isMatch = level1Code === 'SZ';
          if (isMatch) matchingCount++;

          console.log(`     ${acc.code}: ${acc.namePath?.split('/').slice(0, 3).join('/')}... 层级1=${level1Code} ${isMatch ? '✅' : '❌'}`);
        }

        console.log(`\n   匹配账户数: ${matchingCount}/${accounts.length}`);

        if (matchingCount === 0) {
          console.log('\n   ❌ 问题: 没有账户满足筛选条件！');
          console.log('   工时结果的账户中，层级1都不是"SZ"，所以被筛选掉了');
        }
      }
    }

    // 检查生产记录的orgId是否与工时结果的账户匹配
    console.log('\n3. 检查组织匹配:');
    console.log(`   生产记录组织ID: ${prodRecord.orgId}`);
    console.log(`   工时结果涉及的账户数: ${paths.size}`);

    // 获取生产记录的orgPath
    const org = await prisma.organization.findUnique({
      where: { id: prodRecord.orgId }
    });

    if (org) {
      console.log(`   生产记录组织: ${org.name} (${org.code})`);
      console.log(`   生产记录组织类型: ${org.type}`);
    }

    console.log('\n4. 分摊计算的关键问题:');
    console.log('   分摊计算需要:');
    console.log('   - 生产记录的 orgId (来源账户)');
    console.log('   - 工时结果的账户满足筛选条件');
    console.log('   - 工时结果的账户路径包含生产记录的组织');
    console.log('\n   如果工时结果来自"苏州工厂"的账户，但生产记录的orgId是"杭州工厂"，则无法分摊');
  }

  console.log('\n========== 排查完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
