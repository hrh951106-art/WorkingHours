import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccountHours() {
  console.log('========================================');
  console.log('检查工时记录的劳动力账户');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 获取直接工时代码
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  const actualHoursCode = await prisma.attendanceCode.findUnique({
    where: { code: generalConfig?.actualHoursAllocationCode || 'I03' },
  });

  if (!actualHoursCode) {
    console.log('❌ 未找到直接工时代码');
    return;
  }

  // 2. 获取直接工时记录
  const directResults = await prisma.calcResult.findMany({
    where: {
      calcDate,
      attendanceCodeId: actualHoursCode.id,
    },
    include: {
      employee: true,
      attendanceCode: true,
    },
  });

  console.log(`直接工时记录数: ${directResults.length}\n`);

  // 3. 检查每条记录的账户工时分配
  console.log('========================================');
  console.log('工时记录的账户分配详情');
  console.log('========================================\n');

  for (const result of directResults) {
    console.log(`员工: ${result.employeeNo} ${result.employee?.name || ''}`);
    console.log(`  总工时: ${result.actualHours}h`);
    console.log(`  主账户ID: ${result.accountId || 'NULL'}`);
    console.log(`  主账户名称: ${result.accountName || 'N/A'}`);

    // 解析 accountHours JSON
    let accountHours = [];
    try {
      if (result.accountHours) {
        accountHours = JSON.parse(result.accountHours);
      }
    } catch (e) {
      console.log(`  ⚠️  accountHours 解析失败`);
    }

    if (accountHours.length > 0) {
      console.log(`  账户工时分配 (${accountHours.length} 个账户):`);
      accountHours.forEach((ah: any, idx: number) => {
        console.log(`    ${idx + 1}. 账户ID: ${ah.accountId}`);
        console.log(`       账户名称: ${ah.accountName}`);
        console.log(`       工时: ${ah.hours}h`);
      });
    } else {
      console.log(`  未分账户工时`);
    }
    console.log();
  }

  // 4. 获取劳动力账户信息
  console.log('========================================');
  console.log('劳动力账户信息');
  console.log('========================================\n');

  // 收集所有涉及到的账户ID
  const allAccountIds = new Set<number>();
  directResults.forEach(r => {
    if (r.accountId) allAccountIds.add(r.accountId);
    try {
      if (r.accountHours) {
        const accountHours = JSON.parse(r.accountHours);
        accountHours.forEach((ah: any) => {
          if (ah.accountId) allAccountIds.add(ah.accountId);
        });
      }
    } catch (e) {}
  });

  const accounts = await prisma.laborAccount.findMany({
    where: {
      id: { in: Array.from(allAccountIds) },
    },
  });

  console.log(`涉及账户数量: ${accounts.length}\n`);

  accounts.forEach(acc => {
    console.log(`账户ID: ${acc.id}`);
    console.log(`  账户名称: ${acc.name}`);
    console.log(`  账户代码: ${acc.code}`);
    console.log(`  账户类型: ${acc.type}`);
    console.log(`  账户路径: ${acc.namePath || acc.path || 'N/A'}`);
    console.log();
  });

  // 5. 分析如何从账户路径提取产线
  console.log('========================================');
  console.log('账户路径分析');
  console.log('========================================\n');

  console.log('账户路径格式示例:');
  console.log('  富阳工厂/W1总装车间/L1线体////直接设备');
  console.log('  富阳工厂/W1总装车间/L2线体////直接设备');
  console.log('\n需要从路径中提取产线标识（如"L1线体"、"L2线体"）');
  console.log('然后匹配到对应的产线记录\n');
}

checkAccountHours()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
