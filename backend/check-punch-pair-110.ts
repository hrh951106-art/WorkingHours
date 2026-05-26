import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check punch pair 110 details
  const pp = await prisma.punchPair.findUnique({
    where: { id: 110 },
    include: { account: true },
  });

  console.log('摆卡 ID 110 详情:');
  console.log(`  员工: ${pp?.employeeNo}`);
  console.log(`  日期: ${pp?.pairDate.toISOString().split('T')[0]}`);
  console.log(`  账户ID: ${pp?.accountId}`);
  console.log(`  账户名称: ${pp?.account?.namePath}`);

  if (pp?.account) {
    const hierarchyValues = JSON.parse(pp.account.hierarchyValues || '[]');
    const filledLevels = hierarchyValues
      .filter((hv: any) => hv.selectedValue)
      .map((hv: any) => hv.level);

    console.log(`  有值的层级: ${filledLevels.join(', ')}`);
    console.log(`  层级详情:`);
    hierarchyValues.forEach((hv: any) => {
      if (hv.selectedValue) {
        console.log(`    - Level ${hv.level} (${hv.name}): ${hv.selectedValue.name}`);
      }
    });
  }

  // Account matching simulation
  const lineCode = await prisma.calculationAttendanceCode.findFirst({
    where: { code: 'A02' },
  });

  const accountLevels = JSON.parse(lineCode?.accountLevels || '[]');
  const configLevels = accountLevels.map((l: number) => l + 1);

  console.log('\n线体工时配置:');
  console.log(`  账户层级: [${accountLevels.join(',')}] → level: [${configLevels.join(',')}]`);

  if (pp?.account) {
    const hierarchyValues = JSON.parse(pp.account.hierarchyValues || '[]');
    const filledLevels = hierarchyValues
      .filter((hv: any) => hv.selectedValue)
      .map((hv: any) => hv.level);

    console.log('\n账户匹配检查:');
    console.log(`  账户有值的层级: [${filledLevels.join(',')}]`);
    console.log(`  配置的层级: [${configLevels.join(',')}]`);

    // Check if all configured levels have values
    let allConfiguredHaveValues = true;
    for (const level of configLevels) {
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);
      if (!levelConfig || !levelConfig.selectedValue) {
        console.log(`  ❌ 层级level${level}没有值`);
        allConfiguredHaveValues = false;
      }
    }

    // Check if account has levels outside configuration
    let hasExtraLevels = false;
    for (const filledLevel of filledLevels) {
      if (!configLevels.includes(filledLevel)) {
        console.log(`  ❌ 账户有配置之外的层级level${filledLevel}`);
        hasExtraLevels = true;
      }
    }

    if (allConfiguredHaveValues && !hasExtraLevels) {
      console.log(`  ✅ 账户匹配`);
    } else {
      console.log(`  ❌ 账户不匹配`);
    }
  }

  // Check the punch times
  console.log('\n打卡时间:');
  console.log(`  上班打卡: ${pp?.inPunchTime}`);
  console.log(`  下班打卡: ${pp?.outPunchTime}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
