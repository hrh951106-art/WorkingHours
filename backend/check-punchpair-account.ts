import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询5月12日的PunchPair及其账户信息
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      id: { in: [107, 108, 109, 110] },
    },
    include: {
      account: true,
    },
  });

  console.log('5月12日的PunchPair及其账户信息：\n');
  punchPairs.forEach(p => {
    console.log(`PunchPair ID: ${p.id}`);
    console.log(`  员工: ${p.employeeNo}`);
    console.log(`  accountId: ${p.accountId}`);
    if (p.account) {
      const account = p.account;
      console.log(`  账户名称: ${account.name}`);
      console.log(`  账户层级: ${account.level}`);
      console.log(`  账户路径: ${account.path}`);
      console.log(`  层级值: ${JSON.stringify(account.hierarchyValues)}`);
    }
    console.log('');
  });

  // 查询线体工时出勤代码的账户层级配置
  const lineCode = await prisma.calculationAttendanceCode.findFirst({
    where: {
      code: 'A02',
    },
  });

  if (lineCode) {
    const accountLevels = JSON.parse(lineCode.accountLevels || '[]');
    console.log('线体工时出勤代码配置:');
    console.log(`  账户层级要求: ${accountLevels}`);
    console.log('');
    console.log('匹配分析：');
    punchPairs.forEach(p => {
      if (p.account) {
        const isMatch = accountLevels.includes(p.account.level);
        console.log(`  PunchPair ${p.id}: 账户层级=${p.account.level}, 匹配=${isMatch ? '是✅' : '否❌'}`);
      } else {
        console.log(`  PunchPair ${p.id}: accountId=null, 匹配=否❌`);
      }
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
