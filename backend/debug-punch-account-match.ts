import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-10';

  console.log(`=== 诊断摆卡记录和账户匹配问题 ===\n`);

  // 1. 获取摆卡记录
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: employeeNo,
      pairDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    },
    orderBy: { id: 'asc' }
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录\n`);

  // 2. 获取精益工时出勤代码
  const leanCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
      type: 'LEAN_HOURS',
      calculateHours: true
    },
    orderBy: { priority: 'asc' }
  });

  console.log(`找到 ${leanCodes.length} 个精益工时出勤代码:\n`);
  leanCodes.forEach(code => {
    console.log(`- ${code.code} (${code.name}): accountLevels=${code.accountLevels}`);
  });
  console.log('');

  // 3. 检查每个摆卡记录的账户匹配情况
  for (const pp of punchPairs) {
    console.log(`=== 摆卡记录 ID=${pp.id}, accountId=${pp.accountId} ===`);

    if (!pp.accountId) {
      console.log('无刷卡账户，跳过\n');
      continue;
    }

    // 获取刷卡账户
    const account = await prisma.laborAccount.findUnique({
      where: { id: pp.accountId },
      select: {
        id: true,
        namePath: true,
        path: true,
        level: true,
        hierarchyValues: true,
      }
    });

    if (!account) {
      console.log('未找到刷卡账户\n');
      continue;
    }

    console.log(`刷卡账户: ${account.namePath}`);
    console.log(`层级: ${account.level}`);
    console.log(`层级值: ${account.hierarchyValues?.substring(0, 100)}...\n`);

    const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];

    // 测试每个出勤代码的匹配情况
    console.log('匹配情况:');
    leanCodes.forEach(code => {
      const accountLevels = JSON.parse(code.accountLevels || '[]');

      if (accountLevels.length === 0) {
        console.log(`  ${code.code}: ✅ 匹配 (accountLevels为空)`);
        return;
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
        console.log(`  ${code.code}: ❌ 不匹配 (缺少层级: ${missingLevels.join(', ')})`);
      } else {
        // 检查组织层级匹配
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

        const configOrgLevels = accountLevels.map(s => s + 1).filter(l => l <= 3);
        const maxConfigOrgLevel = configOrgLevels.length > 0 ? Math.max(...configOrgLevels) : 0;

        if (maxConfigOrgLevel > 0 && accountOrgLevel !== maxConfigOrgLevel) {
          console.log(`  ${code.code}: ❌ 不匹配 (组织层级不匹配: ${accountOrgLevel} !== ${maxConfigOrgLevel})`);
        } else {
          console.log(`  ${code.code}: ✅ 匹配`);
        }
      }
    });

    console.log('');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
