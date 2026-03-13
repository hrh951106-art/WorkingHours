import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProblemLines() {
  console.log('========================================');
  console.log('检查问题产线的车间信息');
  console.log('========================================\n');

  // 检查三个问题产线
  const problemLines = ['L1产线', 'L2产线', 'L3产线'];

  for (const lineName of problemLines) {
    console.log(`----------------------------------------`);
    console.log(`产线名称: ${lineName}`);
    console.log(`----------------------------------------`);

    const line = await prisma.productionLine.findFirst({
      where: {
        name: lineName,
        deletedAt: null,
      },
    });

    if (line) {
      console.log(`  产线ID: ${line.id}`);
      console.log(`  产线代码: ${line.code}`);
      console.log(`  组织ID: ${line.orgId}`);
      console.log(`  组织名称: ${line.orgName}`);
      console.log(`  车间ID: ${line.workshopId}`);
      console.log(`  车间名称: ${line.workshopName || 'NULL'}`);

      // 构建账户名称（使用当前逻辑）
      const accountNameUsingWorkshopName = line.workshopName
        ? `富阳工厂/${line.workshopName}/${line.name}////间接设备`
        : 'NULL (因为workshopName为空)';
      console.log(`  当前逻辑的账户名称: ${accountNameUsingWorkshopName}`);

      // 检查该账户是否存在
      if (accountNameUsingWorkshopName !== 'NULL (因为workshopName为空)') {
        const account = await prisma.laborAccount.findFirst({
          where: {
            name: accountNameUsingWorkshopName,
            status: 'ACTIVE',
          },
        });
        console.log(`  账户存在: ${account ? '是 (ID: ' + account.id + ')' : '否'}`);
      }

      // 尝试查找实际的间接设备账户
      const actualAccounts = await prisma.laborAccount.findMany({
        where: {
          name: {
            endsWith: `${line.name}////间接设备`,
          },
          status: 'ACTIVE',
        },
      });

      if (actualAccounts.length > 0) {
        console.log(`  实际存在的间接设备账户:`);
        for (const acc of actualAccounts) {
          console.log(`    - ${acc.name} (ID: ${acc.id})`);
        }
      } else {
        console.log(`  没有找到该产线的间接设备账户`);
      }
    } else {
      console.log(`  ✗ 未找到该产线`);
    }

    console.log();
  }

  console.log('========================================');
  console.log('检查完成');
  console.log('========================================\n');

  console.log('问题分析:');
  console.log('如果 workshopName 字段为 NULL 或不正确，');
  console.log('getLineIndirectAccount 方法将无法找到正确的账户。\n');

  console.log('解决方案:');
  console.log('需要修复 getLineIndirectAccount 方法，');
  console.log('使其能够正确获取车间名称。\n');
}

checkProblemLines()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
