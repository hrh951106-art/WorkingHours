import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWorkshopIdResolution() {
  console.log('========================================');
  console.log('测试车间ID解析逻辑');
  console.log('========================================\n');

  // 1. 查询"富阳工厂/W1总装车间/////间接设备"账户
  console.log('第一步：查询车间间接设备账户\n');

  const workshopAccount = await prisma.laborAccount.findFirst({
    where: {
      name: '富阳工厂/W1总装车间/////间接设备',
      status: 'ACTIVE',
    },
  });

  if (!workshopAccount) {
    console.log('✗ 未找到车间间接设备账户');
    await prisma.$disconnect();
    return;
  }

  console.log(`找到账户: ${workshopAccount.name}`);
  console.log(`账户ID: ${workshopAccount.id}`);
  console.log(`hierarchyValues: ${workshopAccount.hierarchyValues || 'NULL'}`);

  // 2. 测试解析逻辑
  console.log('\n第二步：测试车间ID解析逻辑\n');

  let sourceWorkshopId: number | null = null;

  // 首先尝试从hierarchyValues中获取workshopId
  try {
    const hierarchyValues = JSON.parse(workshopAccount.hierarchyValues || '{}');
    if (hierarchyValues.workshopId) {
      sourceWorkshopId = hierarchyValues.workshopId;
      console.log(`✓ 从hierarchyValues解析出车间ID: ${sourceWorkshopId}`);
    } else {
      console.log(`✗ hierarchyValues中没有workshopId字段`);
    }
  } catch (e) {
    console.log(`✗ 解析hierarchyValues失败: ${e}`);
  }

  // 如果hierarchyValues中没有workshopId，尝试从账户名称中解析
  if (!sourceWorkshopId) {
    console.log(`\n尝试从账户名称解析...`);
    if (workshopAccount.name.includes('W1总装车间')) {
      sourceWorkshopId = 6; // W1总装车间的ID
      console.log(`✓ 从账户名称解析出车间ID: ${sourceWorkshopId} (W1总装车间)`);
    } else if (workshopAccount.name.includes('W2总装车间')) {
      sourceWorkshopId = 9; // W2总装车间的ID
      console.log(`✓ 从账户名称解析出车间ID: ${sourceWorkshopId} (W2总装车间)`);
    } else {
      console.log(`✗ 无法从账户名称解析车间ID`);
    }
  }

  // 3. 总结
  console.log('\n第三步：总结\n');

  if (sourceWorkshopId) {
    console.log(`✓ 成功确定车间ID: ${sourceWorkshopId}`);
    console.log(`该账户可以正常参与L01分摊`);
  } else {
    console.log(`✗ 无法确定车间ID`);
    console.log(`该账户无法参与L01分摊，会被跳过`);
    console.log(`建议：更新账户的hierarchyValues，添加workshopId字段`);
  }

  console.log('\n========================================\n');
}

testWorkshopIdResolution()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
