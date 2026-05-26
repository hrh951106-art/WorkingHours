import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-09';

  console.log(`=== 重新计算员工 ${employeeNo} 在 ${date} 的工时 ===\n`);

  // 1. 删除现有的计算结果
  console.log('步骤1：删除现有的计算结果\n');

  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  const deletedCount = await prisma.calcResult.deleteMany({
    where: {
      employeeNo: employeeNo,
      calcDate: {
        gte: dayStart,
        lte: dayEnd
      }
    }
  });

  console.log(`✅ 删除了 ${deletedCount.count} 条旧的计算结果`);
  console.log('');

  // 2. 获取摆卡记录
  console.log('步骤2：获取摆卡记录\n');

  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: employeeNo,
      pairDate: {
        gte: dayStart,
        lte: dayEnd
      }
    },
    include: {
      employee: true
    }
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录`);

  if (punchPairs.length === 0) {
    console.log('❌ 没有摆卡记录，无法计算');
    return;
  }

  // 3. 获取计算出勤代码
  console.log('\n步骤3：获取精益工时出勤代码\n');

  const leanCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
      type: 'LEAN_HOURS',
      calculateHours: true
    },
    orderBy: { priority: 'asc' }
  });

  console.log(`找到 ${leanCodes.length} 个精益工时出勤代码:`);
  leanCodes.forEach(code => {
    console.log(`  - ${code.code} (${code.name}): accountLevels=${code.accountLevels}`);
  });

  // 4. 对每个摆卡记录计算工时
  console.log('\n步骤4：对每个摆卡记录测试账户匹配\n');

  for (const pp of punchPairs) {
    console.log(`\n--- 摆卡 ID: ${pp.id} ---`);
    console.log(`上班时间: ${pp.inPunchTime}`);
    console.log(`下班时间: ${pp.outPunchTime}`);
    console.log(`刷卡账户ID: ${pp.accountId}`);

    if (!pp.accountId) {
      console.log('❌ 没有刷卡账户，跳过');
      continue;
    }

    // 获取刷卡账户
    const account = await prisma.laborAccount.findUnique({
      where: { id: pp.accountId }
    });

    if (!account) {
      console.log('❌ 账户不存在，跳过');
      continue;
    }

    console.log(`账户: ${account.namePath}`);
    console.log('');

    // 测试每个出勤代码的匹配情况
    console.log('出勤代码匹配情况:');
    const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];

    for (const code of leanCodes) {
      const accountLevels = JSON.parse(code.accountLevels || '[]');

      if (accountLevels.length === 0) {
        console.log(`  ${code.code}: ✅ 匹配 (accountLevels为空)`);
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
          console.log(`  ${code.code}: ❌ 不匹配 (组织层级: ${accountOrgLevel} !== ${maxConfigOrgLevel})`);
        } else {
          console.log(`  ${code.code}: ✅ 匹配`);
        }
      }
    }
  }

  console.log('\n\n=== 结论 ===');
  console.log('账户匹配测试完成。现在需要调用计算API来实际计算工时。');
  console.log('');
  console.log('下一步建议：');
  console.log('1. 通过前端界面或API触发批量计算');
  console.log('2. 或者重启后端服务，让计算逻辑自动执行');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
