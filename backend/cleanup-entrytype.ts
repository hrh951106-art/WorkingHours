import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupEntryType() {
  console.log('=== 开始清理 entryType 字段 ===\n');

  // 1. 清理 WorkInfoHistory.customFields 中的 entryType
  console.log('1. 清理 WorkInfoHistory.customFields 中的 entryType...');

  const workInfoHistories = await prisma.workInfoHistory.findMany();

  console.log(`   找到 ${workInfoHistories.length} 条 WorkInfoHistory 记录`);

  let updatedCount = 0;
  for (const history of workInfoHistories) {
    if (!history.customFields) continue;

    const customFields = JSON.parse(history.customFields);
    if (customFields.entryType) {
      delete customFields.entryType;
      await prisma.workInfoHistory.update({
        where: { id: history.id },
        data: { customFields: JSON.stringify(customFields) }
      });
      updatedCount++;
      console.log(`   已清理记录 ID: ${history.id}, 原值: ${customFields.entryType}`);
    }
  }

  console.log(`   共清理 ${updatedCount} 条记录\n`);

  // 2. 删除页签配置中的 entryType 字段
  console.log('2. 删除页签配置中的 entryType 字段...');

  const deletedFields = await prisma.employeeInfoTabField.deleteMany({
    where: { fieldCode: 'entryType' }
  });

  console.log(`   已删除 ${deletedFields.count} 个页签字段配置\n`);

  // 3. 删除 ENTRY_TYPE 数据源
  console.log('3. 删除 ENTRY_TYPE 数据源...');

  const dataSource = await prisma.dataSource.findFirst({
    where: { code: 'ENTRY_TYPE' }
  });

  if (dataSource) {
    // 先删除关联的选项
    await prisma.dataSourceOption.deleteMany({
      where: { dataSourceId: dataSource.id }
    });

    // 删除数据源
    await prisma.dataSource.delete({
      where: { id: dataSource.id }
    });

    console.log(`   已删除 ENTRY_TYPE 数据源及其选项\n`);
  } else {
    console.log('   ENTRY_TYPE 数据源不存在\n');
  }

  console.log('=== 清理完成 ===');
}

cleanupEntryType()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
