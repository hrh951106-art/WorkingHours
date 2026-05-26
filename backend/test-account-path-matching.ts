import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试账户路径层级匹配逻辑
 */

// 账户路径层级名称（根据实际系统定义）
const ACCOUNT_LEVELS = [
  '工厂',      // level 1
  '车间',      // level 2
  '产线',      // level 3
  '产品',      // level 4
  '工序',      // level 5
  'Level 6',   // level 6
  'Level 7',   // level 7
];

/**
 * 层级匹配函数
 * @param policyPath 政策配置的路径（如：///大桶/焊接//）
 * @param actualPath 实际的账户路径（如：大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-）
 * @returns 是否匹配
 */
function matchAccountPathByLevel(policyPath: string, actualPath: string): boolean {
  // 分割路径，但不过滤空字符串，保留层级位置
  const policyParts = policyPath.split('/');
  const actualParts = actualPath.split('/');

  console.log(`\n匹配分析:`);
  console.log(`  政策路径: ${policyPath}`);
  console.log(`  实际路径: ${actualPath}`);
  console.log(`  政策层级数: ${policyParts.length}`);
  console.log(`  实际层级数: ${actualParts.length}`);

  // 如果政策路径为空或只有"/"，则匹配所有
  const hasValidPolicyValue = policyParts.some(p => p && p !== '-');
  if (!hasValidPolicyValue) {
    console.log(`  结果: ✅ 政策路径为空，匹配所有`);
    return true;
  }

  // 逐层检查
  let matchCount = 0;
  let requiredMatches = 0;
  const maxLevel = Math.max(policyParts.length, actualParts.length);

  for (let i = 0; i < maxLevel; i++) {
    const policyValue = policyParts[i] || '';
    const actualValue = actualParts[i] || '';
    const levelName = ACCOUNT_LEVELS[i] || `Level ${i + 1}`;

    // 如果政策中该层级为空、空字符串或"-"，则跳过（表示任意值）
    if (!policyValue || policyValue === '-' || policyValue === '') {
      console.log(`  [${levelName}] 政策值: "${policyValue}" → 跳过（任意值）`);
      continue;
    }

    requiredMatches++;

    // 检查实际路径的该层级是否匹配
    if (actualValue === policyValue) {
      matchCount++;
      console.log(`  [${levelName}] 政策值: "${policyValue}", 实际值: "${actualValue}" → ✅ 匹配`);
    } else {
      console.log(`  [${levelName}] 政策值: "${policyValue}", 实际值: "${actualValue}" → ❌ 不匹配`);
      return false; // 任何一个必需层级不匹配就失败
    }
  }

  const isMatch = matchCount === requiredMatches && requiredMatches > 0;
  console.log(`  结果: ${isMatch ? '✅ 匹配成功' : '❌ 匹配失败'} (匹配了 ${matchCount}/${requiredMatches} 个必需层级)`);
  return isMatch;
}

async function testAccountPathMatching() {
  console.log('========== 测试账户路径层级匹配 ==========\n');

  try {
    // 测试用例
    const testCases = [
      {
        name: '完整路径匹配',
        policyPath: '///大桶/焊接//',
        actualPath: '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-',
        expected: true,
      },
      {
        name: '不同产品',
        policyPath: '///大桶/焊接//',
        actualPath: '大华富阳工厂/W1总装车间/W1总装车间L2产线/小桶/焊接/-/-',
        expected: false,
      },
      {
        name: '不同工序',
        policyPath: '///大桶/焊接//',
        actualPath: '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/包装/-/-',
        expected: false,
      },
      {
        name: '不同产线',
        policyPath: '///大桶/焊接//',
        actualPath: '大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶/焊接/-/-',
        expected: true, // 产品和工序都匹配，产线不同应该匹配
      },
      {
        name: '只指定产品',
        policyPath: '///大桶///',
        actualPath: '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-',
        expected: true,
      },
      {
        name: '只指定工序',
        policyPath: '////焊接//',
        actualPath: '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-',
        expected: true,
      },
    ];

    console.log(`执行 ${testCases.length} 个测试用例:\n`);

    let passCount = 0;
    let failCount = 0;

    for (const testCase of testCases) {
      console.log(`\n测试: ${testCase.name}`);
      const result = matchAccountPathByLevel(testCase.policyPath, testCase.actualPath);
      const passed = result === testCase.expected;

      if (passed) {
        passCount++;
        console.log(`  ✅ 测试通过 (预期: ${testCase.expected}, 实际: ${result})`);
      } else {
        failCount++;
        console.log(`  ❌ 测试失败 (预期: ${testCase.expected}, 实际: ${result})`);
      }
    }

    console.log(`\n========== 测试结果 ==========`);
    console.log(`通过: ${passCount}/${testCases.length}`);
    console.log(`失败: ${failCount}/${testCases.length}`);

    // 查询数据库中的实际数据
    console.log(`\n========== 数据库实际数据 ==========`);

    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        employeeNo: '202604003',
        calcDate: new Date('2026-05-12'),
        source: 1,
      },
      select: {
        accountName: true,
        calcAttendanceCode: true,
        workHours: true,
      },
      distinct: ['accountName'],
    });

    console.log(`\n找到 ${workHourResults.length} 个不同的账户路径:\n`);

    const policyPath = '///大桶/焊接//';
    console.log(`使用政策路径: "${policyPath}"\n`);

    workHourResults.forEach((whr) => {
      const isMatch = matchAccountPathByLevel(policyPath, whr.accountName);
      console.log(`账户: ${whr.accountName}`);
      console.log(`出勤代码: ${whr.calcAttendanceCode}, 工时: ${whr.workHours}`);
      console.log(`匹配结果: ${isMatch ? '✅ 匹配' : '❌ 不匹配'}\n`);
    });

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAccountPathMatching()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试失败:', error);
    process.exit(1);
  });
