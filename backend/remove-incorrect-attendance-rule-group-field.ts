import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // 删除错误创建的自定义字段
    const field = await prisma.customField.findFirst({
      where: { code: 'attendanceRuleGroup' }
    });

    if (field) {
      console.log('删除错误创建的自定义字段:', field.code);
      await prisma.customField.delete({ where: { id: field.id } });
    }

    // 删除错误创建的数据源
    const dataSource = await prisma.dataSource.findFirst({
      where: { code: 'ATTENDANCE_RULE_GROUP' }
    });

    if (dataSource) {
      console.log('删除错误创建的数据源:', dataSource.code);
      await prisma.dataSource.delete({ where: { id: dataSource.id } });
    }

    console.log('清理完成！');
    await prisma.$disconnect();
  } catch (error: any) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
