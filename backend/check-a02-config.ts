import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查A02规则的详细配置
 */
async function checkA02Config() {
  console.log('=== 检查A02规则配置 ===\n');

  try {
    // 1. 获取A02规则
    const a02Rule = await prisma.earnedHoursAllocationConfig.findFirst({
      where: {
        OR: [
          { name: { contains: 'A02' } },
          { code: { contains: 'A02' } },
        ],
      },
    });

    if (!a02Rule) {
      console.log('❌ 未找到A02规则');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ 找到A02规则:');
    console.log(`   ID: ${a02Rule.id}`);
    console.log(`   代码: ${a02Rule.code}`);
    console.log(`   名称: ${a02Rule.name}`);
    console.log(`   状态: ${a02Rule.status}`);
    console.log('');

    // 2. 解析rules字段
    console.log('规则配置 (rules字段):');
    if (a02Rule.rules) {
      try {
        const rules = JSON.parse(a02Rule.rules);
        console.log(JSON.stringify(rules, null, 2));
      } catch (e) {
        console.log('   解析失败:', a02Rule.rules);
      }
    }
    console.log('');

    // 3. 解析sourceConfig字段
    console.log('来源配置 (sourceConfig字段):');
    if (a02Rule.sourceConfig) {
      try {
        const sourceConfig = JSON.parse(a02Rule.sourceConfig);
        console.log(JSON.stringify(sourceConfig, null, 2));
      } catch (e) {
        console.log('   解析失败:', a02Rule.sourceConfig);
      }
    }
    console.log('');

    // 4. 查看5月20日工时数据的路径
    console.log('5月20日工时数据路径:');
    const workDate = new Date('2026-05-20T00:00:00.000Z');

    const workHours = await prisma.workHourResult.findMany({
      where: { workDate: workDate },
      select: {
        employeeNo: true,
        workHours: true,
        accountPath: true,
        accountId: true,
      },
      orderBy: { employeeNo: 'asc' },
    });

    workHours.forEach((wh) => {
      console.log(`  ${wh.employeeNo}: ${wh.accountPath} (accountId: ${wh.accountId})`);
    });
    console.log('');

    // 5. 分析路径层级
    if (workHours.length > 0) {
      const path = workHours[0].accountPath;
      const levels = path ? path.split('/') : [];
      console.log('路径层级分析:');
      console.log(`  总层数: ${levels.length}`);
      levels.forEach((level, index) => {
        const hasValue = level && level.trim() !== '';
        console.log(`  Level ${index + 1}: ${hasValue ? level : '(空)'}`);
      });
      console.log('');

      // 6. 如果rules已解析，分析目标层级
      if (a02Rule.rules) {
        try {
          const rules = JSON.parse(a02Rule.rules);
          if (Array.isArray(rules) && rules.length > 0) {
            console.log('分析分摊配置:');
            rules.forEach((rule, index) => {
              console.log(`  规则 ${index + 1}:`);
              console.log(`    目标层级: ${rule.level || 'N/A'}`);
              console.log(`    目标类型: ${rule.targetType || 'N/A'}`);
              console.log(`    映射类型: ${rule.mappingType || 'N/A'}`);
              console.log(`    映射值: ${rule.mappingValue || 'N/A'}`);

              if (rule.level) {
                const levelIndex = parseInt(rule.level) - 1;
                const levelValue = levels[levelIndex];
                const hasValue = levelValue && levelValue.trim() !== '';

                console.log(`    该层级在工时路径中的值: ${hasValue ? levelValue : '(空)'} ${hasValue ? '✅' : '❌'}`);
              }
            });
            console.log('');
          }
        } catch (e) {
          console.log('解析rules失败');
        }
      }
    }

    console.log('=== 结论 ===\n');

    // 解析rules并分析
    if (a02Rule.rules && workHours.length > 0) {
      try {
        const rules = JSON.parse(a02Rule.rules);
        const path = workHours[0].accountPath;
        const levels = path ? path.split('/') : [];

        if (Array.isArray(rules) && rules.length > 0) {
          console.log('A02规则未生成结果的可能原因:');

          let hasEmptyTargetLevel = false;
          rules.forEach((rule) => {
            if (rule.level) {
              const levelIndex = parseInt(rule.level) - 1;
              const levelValue = levels[levelIndex];
              const hasValue = levelValue && levelValue.trim() !== '';

              if (!hasValue) {
                hasEmptyTargetLevel = true;
                console.log(`  ❌ 目标层级 Level ${rule.level} 在工时路径中为空`);
              }
            }
          });

          if (hasEmptyTargetLevel) {
            console.log('');
            console.log('🔍 根本原因: A02规则配置的目标层级在5月20日的工时数据中为空');
            console.log('   工时路径: SZ/SU01/SZ0101//// (只有3层有值)');
            console.log('   后4层(Level 4-7)为空，如果A02规则的目标是这些层级，则无法生成分摊结果');
          } else if (workHours.length > 0) {
            console.log('  ⚠️ 其他可能原因:');
            console.log('     - 规则计算条件未满足');
            console.log('     - 规则筛选条件与工时数据不匹配');
            console.log('     - 规则的有效时间范围不包含5月20日');
          }
        }
      } catch (e) {
        console.log('无法分析rules字段');
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkA02Config()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
