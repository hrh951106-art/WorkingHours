import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // 查找所有数据源
    const dataSources = await prisma.dataSource.findMany();
    console.log('所有数据源:');
    dataSources.forEach(ds => {
      console.log(`ID: ${ds.id}, Code: ${ds.code}, Name: ${ds.name}, Type: ${ds.type}`);
    });

    // 查找考勤规则组相关的字段
    const customFields = await prisma.customField.findMany({
      where: {
        OR: [
          { code: { contains: 'attendance' } },
          { code: { contains: 'rule' } },
          { name: { contains: '考勤规则组' } }
        ]
      }
    });

    console.log('\n考勤规则组相关的自定义字段:');
    for (const field of customFields) {
      console.log(`ID: ${field.id}, Code: ${field.code}, Name: ${field.name}, DataSourceID: ${field.dataSourceId}`);
      if (field.dataSourceId) {
        const ds = await prisma.dataSource.findUnique({
          where: { id: field.dataSourceId },
          include: { options: true }
        });
        if (ds) {
          console.log(`  -> DataSource: ${ds.code} - ${ds.name}`);
          console.log(`  -> Options: ${ds.options.length} 个选项`);
        }
      }
    }

    // 查找考勤规则组数据
    const ruleGroups = await prisma.attendanceRuleGroup.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, status: true }
    });

    console.log('\n考勤规则组数据:');
    ruleGroups.forEach(rg => {
      console.log(`ID: ${rg.id}, Code: ${rg.code}, Name: ${rg.name}, Status: ${rg.status}`);
    });

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
