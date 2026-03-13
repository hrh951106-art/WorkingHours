import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查账户筛选条件 ===\n');

  // 获取G02配置
  const g02Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: { contains: 'G02' },
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
    },
  });

  if (!g02Config || !g02Config.sourceConfig) {
    console.log('未找到G02配置或分摊源配置');
    return;
  }

  console.log('G02配置名称:', g02Config.configName);
  console.log('G02配置ID:', g02Config.id);

  const accountFilter = JSON.parse(g02Config.sourceConfig.accountFilter || '{}');
  console.log('\n账户筛选条件 (accountFilter):');
  console.log(JSON.stringify(accountFilter, null, 2));

  // 检查是否有accountIds
  if (accountFilter.accountIds) {
    console.log('\n✓ 有accountIds字段:', accountFilter.accountIds);
  } else {
    console.log('\n✗ 没有accountIds字段');
  }

  // 检查是否有hierarchySelections
  if (accountFilter.hierarchySelections) {
    console.log('\n✓ 有hierarchySelections字段:');
    console.log(JSON.stringify(accountFilter.hierarchySelections, null, 2));
  } else {
    console.log('\n✗ 没有hierarchySelections字段');
  }

  // 检查3月11日的I05记录的账户
  console.log('\n\n=== 检查3月11日I05记录的账户信息 ===');
  const i05Code = await prisma.attendanceCode.findUnique({
    where: { code: 'I05' },
  });

  if (i05Code) {
    const i05Records = await prisma.calcResult.findMany({
      where: {
        attendanceCodeId: i05Code.id,
        calcDate: {
          gte: new Date('2026-03-11'),
          lt: new Date('2026-03-12'),
        },
      },
      include: {
        employee: true,
      },
    });

    console.log(`\n找到 ${i05Records.length} 条3月11日的I05记录:`);
    for (const record of i05Records) {
      console.log(`  - 员工: ${record.employeeNo} ${record.employee.name}`);
      console.log(`    账户ID: ${record.accountId}`);
      console.log(`    账户名称: ${record.accountName}`);
      console.log(`    工时: ${record.actualHours}h`);

      // 获取账户详情
      if (record.accountId) {
        const account = await prisma.laborAccount.findUnique({
          where: { id: record.accountId },
        });
        if (account) {
          console.log(`    账户编码: ${account.code}`);
          console.log(`    层级值: ${account.hierarchyValues}`);
        }
      }
      console.log('');
    }

    // 问题分析
    console.log('\n=== 问题分析 ===');
    if (accountFilter.hierarchySelections && !accountFilter.accountIds) {
      console.log('⚠️  发现问题:');
      console.log('  配置使用了 hierarchySelections（层级筛选）');
      console.log('  但后端代码只处理 accountIds（直接账户ID列表）');
      console.log('  因此账户筛选条件被忽略，导致查询时没有应用账户筛选');
      console.log('\n  解决方案:');
      console.log('  1. 修复后端代码，将 hierarchySelections 转换为 accountIds');
      console.log('  2. 或者在前端配置时，将层级选择转换为账户ID列表');
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
