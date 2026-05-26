import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lineCode = await prisma.calculationAttendanceCode.findFirst({
    where: { id: 1 },
  });

  console.log('线体工时出勤代码 (ID: 1):');
  console.log(`  名称: ${lineCode?.name}`);
  console.log(`  代码: ${lineCode?.code}`);
  console.log(`  accountLevels (原始): ${lineCode?.accountLevels}`);

  const accountLevels = JSON.parse(lineCode?.accountLevels || '[]');
  console.log(`  accountLevels (解析后): ${accountLevels}`);
  console.log(`  对应层级: level${accountLevels.map(l => l + 1).join(', level')}`);

  // 检查是否是乱序的
  const sorted = [...accountLevels].sort((a, b) => a - b);
  console.log(`  排序后: ${sorted}`);
  console.log(`  是否排序: ${JSON.stringify(accountLevels) === JSON.stringify(sorted) ? '是' : '否（乱序）'}`);

  // 检查实际账户的层级
  const account = await prisma.laborAccount.findFirst({
    where: { id: 14 },
  });

  if (account) {
    const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');
    const filledLevels = hierarchyValues
      .filter((hv: any) => hv.selectedValue)
      .map((hv: any) => hv.level);

    console.log('');
    console.log('实际账户 (ID: 14):');
    console.log(`  账户名称: ${account.namePath}`);
    console.log(`  有值的层级: ${filledLevels.join(', ')}`);

    // 模拟账户匹配
    const configLevels = accountLevels.map((sortValue: number) => sortValue + 1);
    let match = true;

    for (const level of configLevels) {
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);
      if (!levelConfig || !levelConfig.selectedValue) {
        console.log(`    ❌ 配置的层级level${level}没有值`);
        match = false;
      }
    }

    for (const filledLevel of filledLevels) {
      if (!configLevels.includes(filledLevel)) {
        console.log(`    ❌ 账户有配置之外的层级level${filledLevel}`);
        match = false;
      }
    }

    console.log(`    匹配结果: ${match ? '✅ 匹配' : '❌ 不匹配'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
