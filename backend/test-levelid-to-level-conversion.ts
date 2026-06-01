import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 模拟 convertLevelIdsToLevels 方法
 */
async function convertLevelIdsToLevels(configValue: string): Promise<string> {
  if (!configValue) {
    return configValue;
  }

  const levelNameMap: Record<string, number> = {
    '工厂': 1,
    '车间': 2,
    '产线': 3,
    '产品': 4,
    '工序': 5,
    '岗位': 6,
    '技能等级': 7,
  };

  const values = configValue.split(',').map(v => v.trim());
  const convertedValues: string[] = [];

  for (const value of values) {
    const num = parseInt(value);

    if (isNaN(num)) {
      if (levelNameMap[value]) {
        convertedValues.push(String(levelNameMap[value]));
      } else {
        convertedValues.push(value);
      }
    } else {
      if (num > 7) {
        const hierarchyLevel = await prisma.accountHierarchyConfig.findFirst({
          where: { id: num },
          select: { level: true },
        });

        if (hierarchyLevel) {
          convertedValues.push(String(hierarchyLevel.level));
        } else {
          convertedValues.push(value);
        }
      } else {
        convertedValues.push(value);
      }
    }
  }

  return convertedValues.join(',');
}

async function testConversion() {
  console.log('=== 测试 levelId 到 level 转换逻辑 ===\n');

  // 测试用例
  const testCases = [
    { input: '13', description: 'levelId 13 -> level 5 (工序)' },
    { input: '9', description: 'levelId 9 -> level 1 (工厂)' },
    { input: '5', description: 'level 5 -> level 5 (已经是level，不变)' },
    { input: '工序', description: '层级名称 "工序" -> level 5' },
    { input: '工厂,工序', description: '多个层级名称 -> "1,5"' },
    { input: '9,13', description: '多个levelId -> "1,5"' },
    { input: '4,5', description: '多个level数字 -> "4,5"' },
    { input: '', description: '空字符串 -> 空字符串' },
  ];

  console.log('测试结果：\n');

  for (const testCase of testCases) {
    const result = await convertLevelIdsToLevels(testCase.input);
    const status = result !== testCase.input ? '✅ 转换' : '→ 保持';

    console.log(`${status} "${testCase.input}"`);
    console.log(`      → "${result}"`);
    console.log(`      (${testCase.description})`);
    console.log('');
  }

  // 验证当前数据库配置
  console.log('=== 验证当前数据库配置 ===\n');
  const currentConfig = await prisma.systemConfig.findUnique({
    where: { configKey: 'standardHoursHierarchyLevels' },
  });

  if (currentConfig) {
    console.log(`当前配置值: "${currentConfig.configValue}"`);

    const converted = await convertLevelIdsToLevels(currentConfig.configValue);
    console.log(`转换后值: "${converted}"`);

    if (converted !== currentConfig.configValue) {
      console.log('\n建议：更新数据库配置');
      console.log(`UPDATE SystemConfig SET configValue = '${converted}' WHERE configKey = 'standardHoursHierarchyLevels';`);
    } else {
      console.log('\n✅ 配置值已经是正确的格式（使用level）');
    }
  } else {
    console.log('未找到配置项');
  }
}

testConversion()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
