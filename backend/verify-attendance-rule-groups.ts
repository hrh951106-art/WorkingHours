import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // 查找所有考勤规则组（包括已删除的）
    const allRuleGroups = await prisma.attendanceRuleGroup.findMany({
      include: {
        details: true
      }
    });

    console.log(`数据库中所有考勤规则组 (共 ${allRuleGroups.length} 个):`);
    allRuleGroups.forEach(rg => {
      console.log(`ID: ${rg.id}, Code: ${rg.code}, Name: ${rg.name}, Status: ${rg.status}, DeletedAt: ${rg.deletedAt}`);
    });

    // 查找符合 API 查询条件的考勤规则组
    const activeRuleGroups = await prisma.attendanceRuleGroup.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE'
      },
      include: {
        details: true
      }
    });

    console.log(`\n符合查询条件 status=ACTIVE 的考勤规则组 (共 ${activeRuleGroups.length} 个):`);
    activeRuleGroups.forEach(rg => {
      console.log(`ID: ${rg.id}, Code: ${rg.code}, Name: ${rg.name}, Status: ${rg.status}`);
    });

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
