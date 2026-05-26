import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试账户匹配逻辑
 */
async function main() {
  const accountId = 8; // 刷卡账户8
  const punchPairId = 127;

  console.log(`=== 测试账户匹配逻辑 ===\n`);

  // 1. 获取账户信息
  const account = await prisma.laborAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    console.log('账户不存在');
    return;
  }

  console.log(`账户信息: ${account.namePath}`);
  console.log(`层级: ${account.level}`);
  console.log('');

  // 2. 解析层级值
  const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];
  console.log('层级值详情:');
  hierarchyValues.forEach((hv: any) => {
    const value = hv.selectedValue;
    const valueStr = value ? (value.name || value.code || value) : 'null';
    console.log(`  Level ${hv.level} (${hv.name}, ${hv.mappingType}): ${valueStr}`);
  });
  console.log('');

  // 3. 计算账户的组织层级（连续的ORG类型层级）
  let accountOrgLevel = 0;
  for (const hv of hierarchyValues) {
    if (hv.mappingType !== 'ORG' && hv.mappingType !== 'ORG_TYPE') {
      continue;
    }
    if (hv.selectedValue) {
      accountOrgLevel = hv.level;
    } else {
      break;
    }
  }
  console.log(`账户组织层级: ${accountOrgLevel}\n`);

  // 4. 测试每个精益工时出勤代码的匹配情况
  const leanCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
      type: 'LEAN_HOURS',
      calculateHours: true
    },
    orderBy: { priority: 'asc' }
  });

  console.log(`=== 测试 ${leanCodes.length} 个精益工时出勤代码的匹配情况 ===\n`);

  for (const code of leanCodes) {
    console.log(`--- ${code.code} (${code.name}) ---`);
    console.log(`账户层级配置: ${code.accountLevels}`);

    const accountLevels = JSON.parse(code.accountLevels || '[]');

    if (accountLevels.length === 0) {
      console.log('✅ 匹配 (accountLevels为空，匹配所有账户)\n');
      continue;
    }

    // 检查每个层级是否有值
    const missingLevels = [];
    for (const sortValue of accountLevels) {
      const level = sortValue + 1;
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

      if (!levelConfig || !levelConfig.selectedValue) {
        missingLevels.push(level);
      }
    }

    if (missingLevels.length > 0) {
      console.log(`❌ 不匹配 (缺少层级: ${missingLevels.join(', ')})\n`);
      continue;
    }

    // 检查组织层级匹配
    const configOrgLevels = accountLevels.map(s => s + 1).filter(l => l <= 3);
    const maxConfigOrgLevel = configOrgLevels.length > 0 ? Math.max(...configOrgLevels) : 0;

    console.log(`  配置的组织层级: ${configOrgLevels.join(', ')}`);
    console.log(`  最大组织层级: ${maxConfigOrgLevel}`);
    console.log(`  账户组织层级: ${accountOrgLevel}`);

    if (maxConfigOrgLevel > 0 && accountOrgLevel !== maxConfigOrgLevel) {
      console.log(`❌ 不匹配 (组织层级不匹配: ${accountOrgLevel} !== ${maxConfigOrgLevel})\n`);
    } else {
      console.log(`✅ 匹配\n`);
    }
  }

  console.log('=== 总结 ===');
  console.log('根据上述测试结果：');
  console.log('- 账户8（大华工厂/W1总装车间/W1总装L1产线）的组织层级为3');
  console.log('- AC_001（线体工时）要求组织层级=3，应该匹配 ✅');
  console.log('- AC_002（车间工时）要求组织层级=2，不匹配 ❌');
  console.log('- AC_003（工序工时）要求层级5有值，不匹配 ❌');
  console.log('');
  console.log('所以账户8应该能匹配AC_001，应该能计算出线体工时结果');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
