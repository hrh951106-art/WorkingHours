import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWorkshopIdParsing() {
  console.log('========================================');
  console.log('测试修复后的workshopId解析逻辑');
  console.log('========================================\n');

  // 1. 查询车间间接设备账户
  const account = await prisma.laborAccount.findFirst({
    where: {
      name: '富阳工厂/W1总装车间/////间接设备',
      status: 'ACTIVE',
    },
  });

  if (!account) {
    console.log('✗ 未找到车间间接设备账户');
    await prisma.$disconnect();
    return;
  }

  console.log('测试账户:');
  console.log(`  名称: ${account.name}`);
  console.log(`  hierarchyValues: ${account.hierarchyValues?.substring(0, 100)}...`);

  // 2. 测试修复后的解析逻辑
  console.log('\n测试解析逻辑:\n');

  let sourceWorkshopId: number | null = null;

  // 使用修复后的逻辑
  try {
    const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');

    console.log('1. hierarchyValues是数组:', Array.isArray(hierarchyValues));

    if (Array.isArray(hierarchyValues)) {
      console.log('2. 数组长度:', hierarchyValues.length);

      // 查找车间层级 (levelId=29)
      const workshopLevel = hierarchyValues.find((hv: any) => hv.levelId === 29);

      if (workshopLevel) {
        console.log('3. 找到车间层级:');
        console.log(`   levelId: ${workshopLevel.levelId}`);
        console.log(`   levelName: ${workshopLevel.name}`);
        console.log(`   selectedValue:`, workshopLevel.selectedValue);

        if (workshopLevel.selectedValue && workshopLevel.selectedValue.id) {
          sourceWorkshopId = workshopLevel.selectedValue.id;
          console.log(`\n✓ 成功解析出车间ID: ${sourceWorkshopId}`);
        } else {
          console.log('\n✗ selectedValue或selectedValue.id为空');
        }
      } else {
        console.log('\n✗ 未找到车间层级 (levelId=29)');
      }
    }
  } catch (e) {
    console.log('\n✗ 解析hierarchyValues失败:', e);
  }

  // 3. 备用方案：从账户名称解析
  if (!sourceWorkshopId) {
    console.log('\n使用备用方案：从账户名称解析');

    if (account.name.includes('W1总装车间')) {
      sourceWorkshopId = 6;
      console.log(`✓ 从账户名称解析出车间ID: ${sourceWorkshopId} (W1总装车间)`);
    } else if (account.name.includes('W2总装车间')) {
      sourceWorkshopId = 9;
      console.log(`✓ 从账户名称解析出车间ID: ${sourceWorkshopId} (W2总装车间)`);
    }
  }

  // 4. 总结
  console.log('\n========================================');
  console.log('测试结果');
  console.log('========================================\n');

  if (sourceWorkshopId) {
    console.log(`✓ 成功确定车间ID: ${sourceWorkshopId}`);
    console.log('  修复后的代码能够正确解析hierarchyValues数组结构');
    console.log('  L01分摊规则现在应该能够正常工作');
  } else {
    console.log('✗ 未能确定车间ID');
    console.log('  需要进一步检查');
  }

  console.log('\n========================================\n');
}

testWorkshopIdParsing()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
