import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccountHierarchy() {
  try {
    console.log('=== 检查账户层级配置 ===\n');

    // 1. 检查源账户的层级配置
    console.log('1. 检查"富阳工厂/W1总装车间/////间接设备"账户:');
    const account = await prisma.laborAccount.findFirst({
      where: {
        name: { contains: 'W1总装车间' },
      },
    });

    if (!account) {
      console.log('   未找到该账户');
      return;
    }

    console.log(`   账户ID: ${account.id}`);
    console.log(`   账户名称: ${account.name}`);
    console.log(`   账户编码: ${account.code}`);

    if (account.hierarchyValues) {
      try {
        const hierarchyValues = JSON.parse(account.hierarchyValues);
        console.log(`   层级配置:`);
        hierarchyValues.forEach((hv: any) => {
          console.log(`     - Level ${hv.levelId} (${hv.name}): ${hv.selectedValue?.name || 'N/A'} (ID: ${hv.selectedValue?.id || 'N/A'})`);
        });
      } catch (e) {
        console.log(`   hierarchyValues解析失败: ${e}`);
        console.log(`   原始值: ${account.hierarchyValues}`);
      }
    } else {
      console.log('   hierarchyValues为空');
    }
    console.log();

    // 2. 检查层级配置
    console.log('2. 检查分摊范围层级配置 (levelId=29, 车间):');
    const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
      where: { id: 29 },
    });

    if (hierarchyConfig) {
      console.log(`   层级ID: ${hierarchyConfig.id}`);
      console.log(`   层级级别: ${hierarchyConfig.level}`);
      console.log(`   层级名称: ${hierarchyConfig.name}`);
    } else {
      console.log('   未找到层级配置');
    }
    console.log();

    // 3. 检查产线组织
    console.log('3. 检查产线组织及其车间归属:');
    const lines = await prisma.productionLine.findMany({
      where: {
        deletedAt: null,
      },
      take: 5,
    });

    lines.forEach((line: any) => {
      console.log(`   - ${line.name} (ID: ${line.id})`);
      console.log(`     所属组织: ${line.orgName} (ID: ${line.orgId})`);
      console.log(`     所属车间: ${line.workshopName || 'N/A'} (ID: ${line.workshopId || 'N/A'})`);
    });
    console.log();

    // 4. 检查W1总装车间组织
    console.log('4. 检查W1总装车间组织:');
    const workshop = await prisma.organization.findFirst({
      where: {
        name: { contains: 'W1总装车间' },
      },
    });

    if (workshop) {
      console.log(`   组织ID: ${workshop.id}`);
      console.log(`   组织名称: ${workshop.name}`);
      console.log(`   组织编码: ${workshop.code}`);
    }

  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAccountHierarchy();
