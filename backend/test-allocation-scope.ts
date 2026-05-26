/**
 * 分摊范围功能测试脚本
 *
 * 测试分摊范围层级提取、开线计划表匹配等功能
 */

import { PrismaClient } from '@prisma/client';
import {
  extractLevelFromAccountName,
  extractMultipleLevelsFromAccountName,
  matchLineShiftsByLevel,
  extractWH1001LevelFromLineShift,
  filterParticipatingLineShifts,
  matchAllocationScope,
  getAccountNameHierarchy,
} from './src/common/utils/allocation-scope.utils';

const prisma = new PrismaClient();

async function testExtractLevelFromAccountName() {
  console.log('\n========== 测试从账户名称中提取层级 ==========');

  const testCases = [
    {
      accountName: '大华富阳工厂/W2总装车间/-/大桶/-/-/-',
      level: 1,
      expected: '大华富阳工厂',
    },
    {
      accountName: '大华富阳工厂/W2总装车间/-/大桶/-/-/-',
      level: 2,
      expected: 'W2总装车间',
    },
    {
      accountName: '大华富阳工厂/W2总装车间/-/大桶/-/-/-',
      level: 3,
      expected: null, // 占位符 "-"
    },
    {
      accountName: '大华富阳工厂/W2总装车间/-/大桶/-/-/-',
      level: 4,
      expected: '大桶',
    },
    {
      accountName: '大华富阳工厂/W2总装车间/产线A/工序B/产品C/-/-',
      level: 3,
      expected: '产线A',
    },
  ];

  for (const testCase of testCases) {
    const result = extractLevelFromAccountName(testCase.accountName, testCase.level);
    const passed = result === testCase.expected;
    console.log(
      `${passed ? '✓' : '✗'} 账户: "${testCase.accountName}", 层级 ${testCase.level}: ` +
      `预期 "${testCase.expected}", 实际 "${result}"`
    );
  }
}

async function testExtractMultipleLevels() {
  console.log('\n========== 测试批量提取多个层级 ==========');

  const accountName = '大华富阳工厂/W2总装车间/产线A/工序B/产品C/-/-';
  const levels = [1, 2, 3, 4, 5];
  const result = extractMultipleLevelsFromAccountName(accountName, levels);

  console.log(`账户名称: "${accountName}"`);
  console.log('提取的层级:', result);
}

async function testGetAccountNameHierarchy() {
  console.log('\n========== 测试获取账户名称完整层级信息 ==========');

  const accountName = '大华富阳工厂/W2总装车间/产线A/工序B/产品C/-/-';
  const hierarchy = getAccountNameHierarchy(accountName);

  console.log(`账户名称: "${accountName}"`);
  console.log('完整层级信息:', JSON.stringify(hierarchy, null, 2));
}

async function testMatchLineShiftsByLevel() {
  console.log('\n========== 测试在开线计划表中匹配层级 ==========');

  // 查询所有开线计划记录
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
    },
    take: 10,
  });

  console.log(`查询到 ${lineShifts.length} 条开线计划记录`);

  if (lineShifts.length > 0) {
    // 测试匹配车间层级（level=2）
    const testAccountName = '大华富阳工厂/W2总装车间/-/大桶/-/-/-';
    const level = 2;
    const levelValue = extractLevelFromAccountName(testAccountName, level);

    console.log(`\n测试账户: "${testAccountName}"`);
    console.log(`提取层级 ${level} 的值: "${levelValue}"`);

    if (levelValue) {
      const matched = matchLineShiftsByLevel(lineShifts, level, levelValue);
      console.log(`匹配到 ${matched.length} 条记录`);

      if (matched.length > 0) {
        console.log('匹配的记录:');
        matched.forEach((lineShift, index) => {
          console.log(
            `  ${index + 1}. ID: ${lineShift.id}, 账户: "${lineShift.accountName}", ` +
            `组织: "${lineShift.orgName}", 参与分摊: ${lineShift.participateInAllocation}`
          );
        });
      }
    }
  }
}

async function testExtractWH1001Level() {
  console.log('\n========== 测试从开线计划记录中解析 WH1001 层级 ==========');

  const lineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
      accountName: {
        not: null,
      },
    },
    take: 5,
  });

  console.log(`查询到 ${lineShifts.length} 条有账户名称的开线计划记录`);

  for (const lineShift of lineShifts) {
    console.log(`\n开线计划 ID: ${lineShift.id}`);
    console.log(`  账户名称: "${lineShift.accountName}"`);
    console.log(`  组织名称: "${lineShift.orgName}"`);

    // 提取不同层级的值
    for (let level = 1; level <= 4; level++) {
      const value = extractWH1001LevelFromLineShift(lineShift, level);
      console.log(`  层级 ${level}: "${value}"`);
    }
  }
}

async function testFilterParticipatingLineShifts() {
  console.log('\n========== 测试过滤应该参与分摊的记录 ==========');

  const lineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
    },
    take: 10,
  });

  console.log(`查询到 ${lineShifts.length} 条开线计划记录`);

  const participating = filterParticipatingLineShifts(lineShifts);
  console.log(`应该参与分摊的记录数: ${participating.length}`);

  if (participating.length > 0) {
    console.log('参与分摊的记录:');
    participating.forEach((lineShift, index) => {
      console.log(
        `  ${index + 1}. ID: ${lineShift.id}, 账户: "${lineShift.accountName}", ` +
        `参与: ${lineShift.participateInAllocation}`
      );
    });
  }
}

async function testMatchAllocationScope() {
  console.log('\n========== 测试完整的分摊范围匹配流程 ==========');

  // 查询所有开线计划记录
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
    },
    take: 20,
  });

  console.log(`查询到 ${lineShifts.length} 条开线计划记录`);

  // 测试用例：从某个账户中提取车间层级，然后匹配
  const testCases = [
    {
      name: '测试车间层级匹配',
      sourceAccountName: '大华富阳工厂/W2总装车间/-/大桶/-/-/-',
      allocationScopeLevel: 2,
      wh1001TargetLevel: 2,
    },
    {
      name: '测试工厂层级匹配',
      sourceAccountName: '大华富阳工厂/W2总装车间/-/大桶/-/-/-',
      allocationScopeLevel: 1,
      wh1001TargetLevel: 1,
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log(`  源账户: "${testCase.sourceAccountName}"`);
    console.log(`  分摊范围层级: ${testCase.allocationScopeLevel}`);
    console.log(`  WH1001 目标层级: ${testCase.wh1001TargetLevel}`);

    const matched = matchAllocationScope(
      testCase.sourceAccountName,
      testCase.allocationScopeLevel,
      lineShifts,
      testCase.wh1001TargetLevel
    );

    console.log(`  匹配到 ${matched.length} 条应该参与分摊的记录`);

    if (matched.length > 0) {
      console.log('  匹配的记录:');
      matched.forEach((lineShift, index) => {
        console.log(
          `    ${index + 1}. ID: ${lineShift.id}, 账户: "${lineShift.accountName}", ` +
          `组织: "${lineShift.orgName}"`
        );
      });
    }
  }
}

async function testWithRealData() {
  console.log('\n========== 使用真实数据测试 ==========');

  // 查询一个真实的工时计算结果
  const calcResult = await prisma.calcResult.findFirst({
    where: {
      accountName: {
        not: null,
      },
    },
    orderBy: {
      calcDate: 'desc',
    },
  });

  if (!calcResult) {
    console.log('未找到工时计算结果');
    return;
  }

  console.log(`工时计算结果 ID: ${calcResult.id}`);
  console.log(`  计算日期: ${calcResult.calcDate}`);
  console.log(`  账户名称: "${calcResult.accountName}"`);
  console.log(`  出勤代码: ${calcResult.attendanceCodeName}`);
  console.log(`  工时: ${calcResult.amount}`);

  // 提取账户的层级信息
  const hierarchy = getAccountNameHierarchy(calcResult.accountName || '');
  console.log('\n账户层级信息:');
  console.log(JSON.stringify(hierarchy, null, 2));

  // 测试车间层级匹配
  const workshopLevel = 2;
  const workshopValue = extractLevelFromAccountName(calcResult.accountName || '', workshopLevel);

  if (workshopValue) {
    console.log(`\n提取车间层级 (level=${workshopLevel}): "${workshopValue}"`);

    // 查询当天的开线计划记录
    const lineShifts = await prisma.lineShift.findMany({
      where: {
        scheduleDate: calcResult.calcDate,
        deletedAt: null,
      },
    });

    console.log(`查询到 ${lineShifts.length} 条开线计划记录`);

    // 匹配车间层级
    const matched = matchAllocationScope(
      calcResult.accountName || '',
      workshopLevel,
      lineShifts,
      workshopLevel
    );

    console.log(`匹配到 ${matched.length} 条应该参与分摊的记录`);

    if (matched.length > 0) {
      console.log('\n匹配的记录:');
      matched.forEach((lineShift, index) => {
        console.log(
          `  ${index + 1}. ID: ${lineShift.id}, 班次: "${lineShift.shiftName}", ` +
          `账户: "${lineShift.accountName}", 组织: "${lineShift.orgName}"`
        );
      });
    }
  }
}

async function main() {
  try {
    console.log('========================================');
    console.log('     分摊范围功能测试');
    console.log('========================================');

    await testExtractLevelFromAccountName();
    await testExtractMultipleLevels();
    await testGetAccountNameHierarchy();
    await testMatchLineShiftsByLevel();
    await testExtractWH1001Level();
    await testFilterParticipatingLineShifts();
    await testMatchAllocationScope();
    await testWithRealData();

    console.log('\n========================================');
    console.log('     所有测试完成');
    console.log('========================================\n');
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
