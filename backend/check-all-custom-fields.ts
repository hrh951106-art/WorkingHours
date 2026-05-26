import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // 查找所有自定义字段
    const customFields = await prisma.customField.findMany({
      orderBy: { id: 'asc' }
    });

    console.log(`所有自定义字段 (共 ${customFields.length} 个):`);
    customFields.forEach(field => {
      console.log(`ID: ${field.id}, Code: ${field.code}, Name: ${field.name}, Type: ${field.type}, DataSourceID: ${field.dataSourceId}, Group: ${field.group}`);
    });

    // 查找考勤规则组数据
    const ruleGroups = await prisma.attendanceRuleGroup.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, status: true }
    });

    console.log(`\n考勤规则组数据 (共 ${ruleGroups.length} 个):`);
    ruleGroups.forEach(rg => {
      console.log(`ID: ${rg.id}, Code: ${rg.code}, Name: ${rg.name}, Status: ${rg.status}`);
    });

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
