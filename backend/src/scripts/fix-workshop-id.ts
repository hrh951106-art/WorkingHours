import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixWorkshopId() {
  console.log('========================================');
  console.log('修复产线车间ID');
  console.log('========================================\n');

  // 策略：将L1和L2产线都设为同一个车间，这样它们可以互相分摊
  // 或者为每个产线创建独立的车间

  // 方案1：将所有产线都设为车间6（A01车间）
  const WORKSHOP_ID = 6;
  const WORKSHOP_NAME = 'A01车间';

  const linesToUpdate = [
    { id: 3, name: 'L1产线' },
    { id: 4, name: 'L2产线' },
  ];

  console.log(`将以下产线更新为车间ID ${WORKSHOP_ID} (${WORKSHOP_NAME}):\n`);

  for (const line of linesToUpdate) {
    const updated = await prisma.productionLine.update({
      where: { id: line.id },
      data: {
        workshopId: WORKSHOP_ID,
        workshopName: WORKSHOP_NAME,
      },
    });

    console.log(`✓ 更新产线: ${updated.name} (ID: ${updated.id})`);
    console.log(`  车间ID: ${updated.workshopId}`);
    console.log(`  车间名称: ${updated.workshopName}`);
  }

  console.log('\n========================================');
  console.log('修复完成！');
  console.log('========================================\n');

  // 验证修复结果
  console.log('验证修复结果:\n');
  const lines = await prisma.productionLine.findMany({
    where: {
      id: { in: [3, 4] },
    },
  });

  lines.forEach(line => {
    console.log(`${line.name} (ID: ${line.id})`);
    console.log(`  车间ID: ${line.workshopId || 'NULL'} ✓`);
    console.log(`  车间名称: ${line.workshopName || '未设置'}`);
  });

  console.log('\n现在可以重新执行分摊计算了！');
}

fixWorkshopId()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
