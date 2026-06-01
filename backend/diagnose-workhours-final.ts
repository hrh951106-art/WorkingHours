import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== 最终诊断：2026-05-19的工时数据详情 ===\n');

  const targetDate = new Date('2026-05-19');
  targetDate.setHours(0, 0, 0, 0);

  // 1. 查询所有状态的工时结果
  console.log('1. 查询所有状态的WorkHourResult:');
  const allWorkResults = await prisma.workHourResult.findMany({
    where: {
      workDate: targetDate,
    },
  });

  console.log(`   总记录数（所有状态）: ${allWorkResults.length}`);

  if (allWorkResults.length > 0) {
    // 按状态分组统计
    const statusGroups = new Map<string, number>();
    for (const result of allWorkResults) {
      const status = result.status || 'UNKNOWN';
      statusGroups.set(status, (statusGroups.get(status) || 0) + 1);
    }

    console.log('   按状态分组:');
    for (const [status, count] of statusGroups.entries()) {
      console.log(`   - ${status}: ${count} 条`);
    }

    console.log('\n   详细记录:');
    for (const result of allWorkResults) {
      console.log(`   - 员工: ${result.employeeNo}, 工时: ${result.workHours}, 出勤代码: ${result.attendanceCode}, 账户: ${result.accountPath}, 状态: ${result.status}`);
    }
  }

  // 2. 只查询ACTIVE状态
  console.log('\n2. 只查询ACTIVE状态的WorkHourResult:');
  const activeWorkResults = await prisma.workHourResult.findMany({
    where: {
      workDate: targetDate,
      status: 'ACTIVE',
    },
  });

  console.log(`   ACTIVE状态记录数: ${activeWorkResults.length}`);

  if (activeWorkResults.length > 0) {
    console.log('\n   ACTIVE记录详情:');
    for (const result of activeWorkResults) {
      console.log(`   - 员工: ${result.employeeNo}, 工时: ${result.workHours}, 出勤代码: ${result.attendanceCode}, 账户路径: ${result.accountPath}`);
    }
  }

  // 3. 检查A01规则中的出勤代码筛选
  console.log('\n3. 检查A01规则的出勤代码筛选条件:');
  const config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: {
      code: 'A01',
      deletedAt: null,
    },
  });

  if (config) {
    try {
      const sourceConfig = JSON.parse(config.sourceConfig || '{}');
      const attendanceCodes = sourceConfig.attendanceCodes || [];
      console.log(`   A01规则要求的出勤代码: [${attendanceCodes.join(', ')}]`);

      // 检查ACTIVE工时记录中有多少符合出勤代码
      if (activeWorkResults.length > 0 && attendanceCodes.length > 0) {
        const matchingCount = activeWorkResults.filter(r =>
          attendanceCodes.includes(r.attendanceCode)
        ).length;

        console.log(`   符合A01出勤代码的工时记录: ${matchingCount} 条`);

        if (matchingCount === 0) {
          const uniqueCodes = [...new Set(activeWorkResults.map(r => r.attendanceCode))];
          console.log(`   实际的出勤代码: [${uniqueCodes.join(', ')}]`);
          console.log('   ❌ 没有工时记录符合A01规则的出勤代码筛选！');
        }
      }
    } catch (e) {
      console.log('   解析配置失败:', e);
    }
  }

  // 4. 检查账户层级筛选
  console.log('\n4. 检查账户层级筛选条件:');
  if (config) {
    try {
      const sourceConfig = JSON.parse(config.sourceConfig || '{}');
      const hierarchySelections = sourceConfig.accountFilter?.hierarchySelections || [];

      if (hierarchySelections.length > 0) {
        console.log('   A01规则的层级筛选:');
        for (const selection of hierarchySelections) {
          console.log(`   - Level ${selection.level} (${selection.levelName}): [${selection.valueIds.join(', ')}]`);
        }

        // 检查工时记录中有多少符合层级筛选
        let matchingCount = 0;
        for (const result of activeWorkResults) {
          if (result.accountPath) {
            // 简单检查：看账户路径是否包含配置的值
            let match = true;
            for (const selection of hierarchySelections) {
              const valueIds = selection.valueIds;
              const hasMatchingValue = valueIds.some(v => result.accountPath.includes(v));
              if (!hasMatchingValue) {
                match = false;
                break;
              }
            }
            if (match) matchingCount++;
          }
        }

        console.log(`   符合A01层级筛选的工时记录: ${matchingCount} 条`);

        if (matchingCount === 0 && activeWorkResults.length > 0) {
          console.log('   工时记录的账户路径:');
          for (const result of activeWorkResults) {
            console.log(`   - ${result.accountPath}`);
          }
          console.log('   ❌ 没有工时记录符合A01规则的层级筛选！');
        }
      } else {
        console.log('   没有配置层级筛选');
      }
    } catch (e) {
      console.log('   解析配置失败:', e);
    }
  }

  // 5. 总结
  console.log('\n=== 诊断总结 ===');

  if (allWorkResults.length === 0) {
    console.log('❌ 根本原因：2026-05-19完全没有工时记录');
    console.log('   需要执行工时推送操作生成工时记录');
  } else if (activeWorkResults.length === 0) {
    console.log('❌ 根本原因：2026-05-19的工时记录都不是ACTIVE状态');
    console.log('   需要将工时记录状态更新为ACTIVE');
  } else {
    console.log(`✓ 2026-05-19有 ${activeWorkResults.length} 条ACTIVE状态的工时记录`);
    console.log('   需要检查出勤代码和层级筛选是否匹配');
  }
}

diagnose()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
