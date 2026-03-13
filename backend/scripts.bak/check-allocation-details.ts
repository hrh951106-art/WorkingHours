import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 详细检查工时记录 ===\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setDate(endDate.getDate() + 1);

  // 检查工时记录的详细信息
  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    include: {
      employee: {
        include: {
          org: true,
        },
      },
      attendanceCode: true,
    },
  });

  console.log(`工时记录详情 (共 ${calcResults.length} 条):\n`);

  // 按账户分组显示
  const byAccount = new Map();
  calcResults.forEach(r => {
    const accountId = r.accountId;
    if (!byAccount.has(accountId)) {
      byAccount.set(accountId, []);
    }
    byAccount.get(accountId).push(r);
  });

  for (const [accountId, records] of byAccount) {
    const account = await prisma.laborAccount.findUnique({
      where: { id: accountId },
    });

    console.log(`账户: ${account?.name} (${account?.code})`);
    console.log(`  账户ID: ${accountId}`);
    console.log(`  记录数: ${records.length}`);
    records.slice(0, 3).forEach((r, i) => {
      console.log(`    [${i + 1}] ${r.calcDate.toISOString().split('T')[0]} | ${r.employee.employeeNo} ${r.employee.name} | ${r.attendanceCode?.code} | ${r.actualHours || 0}h`);
    });
    console.log('');
  }

  // 检查I05出勤代码的工时记录
  console.log('\n=== 检查I05出勤代码的记录 ===');
  const i05Code = await prisma.attendanceCode.findUnique({
    where: { code: 'I05' },
  });

  if (i05Code) {
    const i05Results = await prisma.calcResult.count({
      where: {
        attendanceCodeId: i05Code.id,
        calcDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
    console.log(`I05出勤代码的工时记录数: ${i05Results}`);

    if (i05Results === 0) {
      console.log('\n⚠️  问题确认:');
      console.log('  G02配置要求出勤代码为 I05（工厂工时）');
      console.log('  但数据库中该日期范围内没有任何使用I05出勤代码的工时记录');
      console.log('  实际存在的出勤代码: I01, I02, I03');
      console.log('\n解决方案:');
      console.log('  1. 修改G02配置，将出勤代码改为 I01/I02/I03');
      console.log('  2. 或者创建一些使用I05出勤代码的工时记录用于测试');
    }
  }
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
