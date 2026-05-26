import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLeanHoursCalculation() {
  console.log('=== 测试精益工时计算 ===\n');

  // 1. 查找一个有效的摆卡记录
  const punchPair = await prisma.punchPair.findFirst({
    where: {
      inPunchTime: { not: null },
      outPunchTime: { not: null },
    },
    include: {
      employee: true,
    },
  });

  if (!punchPair) {
    console.log('没有找到有效的摆卡记录');
    return;
  }

  console.log(`测试摆卡记录:`);
  console.log(`  ID: ${punchPair.id}`);
  console.log(`  员工: ${punchPair.employeeNo}`);
  console.log(`  日期: ${new Date(punchPair.pairDate).toISOString()}`);
  console.log(`  班次ID: ${punchPair.shiftId}`);
  console.log(`  刷卡账户ID: ${punchPair.accountId}`);
  console.log(`  上班时间: ${punchPair.inPunchTime}`);
  console.log(`  下班时间: ${punchPair.outPunchTime}\n`);

  // 2. 查询精益工时出勤代码
  const attendanceCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
      type: 'LEAN_HOURS',
      calculateHours: true,
    },
    orderBy: { priority: 'asc' },
  });

  console.log(`找到 ${attendanceCodes.length} 个精益工时出勤代码:`);
  attendanceCodes.forEach(code => {
    console.log(`  - ${code.name} (ID: ${code.id}, accountLevels: ${code.accountLevels})`);
  });
  console.log('');

  // 3. 查询刷卡账户
  if (punchPair.accountId) {
    const punchAccount = await prisma.laborAccount.findUnique({
      where: { id: punchPair.accountId },
      select: { id: true, namePath: true, path: true, level: true, hierarchyValues: true },
    });

    if (punchAccount) {
      console.log(`刷卡账户:`);
      console.log(`  ID: ${punchAccount.id}`);
      console.log(`  名称: ${punchAccount.namePath}`);
      console.log(`  路径: ${punchAccount.path}`);
      console.log(`  层级: ${punchAccount.level}`);
      console.log(`  层级值: ${punchAccount.hierarchyValues?.substring(0, 100)}...\n`);

      // 测试账户匹配
      console.log(`测试账户匹配:`);
      const hierarchyValues = punchAccount.hierarchyValues ? JSON.parse(punchAccount.hierarchyValues) : [];

      // 找出账户的组织层级
      let accountOrgLevel = 0;
      for (const hv of hierarchyValues) {
        if ((hv.mappingType === 'ORG' || hv.mappingType === 'ORG_TYPE') && hv.selectedValue) {
          accountOrgLevel = hv.level;
        } else if ((hv.mappingType === 'ORG' || hv.mappingType === 'ORG_TYPE') && !hv.selectedValue) {
          break;
        }
      }

      console.log(`  账户组织层级: ${accountOrgLevel}`);

      attendanceCodes.forEach(code => {
        const accountLevels = JSON.parse(code.accountLevels || '[]');
        const configOrgLevels = accountLevels.map(s => s + 1).filter(l => l <= 3);
        const maxConfigOrgLevel = configOrgLevels.length > 0 ? Math.max(...configOrgLevels) : 0;

        console.log(`  ${code.name}: maxConfigOrgLevel=${maxConfigOrgLevel}, 匹配=${accountOrgLevel === maxConfigOrgLevel || maxConfigOrgLevel === 0}`);
      });
    }
  }

  console.log('\n=== 测试完成 ===');
}

testLeanHoursCalculation()
  .then(() => {
    console.log('脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
