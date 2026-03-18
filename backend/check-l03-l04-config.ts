import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkL03L04Config() {
  try {
    console.log('=== 检查L03和L04配置 ===\n');

    // 1. 检查L03配置
    console.log('1. L03配置详情 (同效产量):');
    const l03 = await prisma.allocationConfig.findUnique({
      where: { id: 10 },
      include: {
        sourceConfig: true,
        rules: {
          where: { deletedAt: null, status: 'ACTIVE' },
        },
      },
    });

    if (l03) {
      console.log(`   配置代码: ${l03.configCode}`);
      console.log(`   配置名称: ${l03.configName}`);
      console.log(`   考勤代码: ${l03.sourceConfig?.attendanceCodes}`);
      const rule = l03.rules[0];
      console.log(`   分摊依据: ${rule.allocationBasis}`);
      console.log(`   分摊层级: ${rule.allocationHierarchyLevels}`);
    }
    console.log();

    // 2. 检查L04配置
    console.log('2. L04配置详情 (标准工时):');
    const l04 = await prisma.allocationConfig.findUnique({
      where: { id: 12 },
      include: {
        sourceConfig: true,
        rules: {
          where: { deletedAt: null, status: 'ACTIVE' },
        },
      },
    });

    if (l04) {
      console.log(`   配置代码: ${l04.configCode}`);
      console.log(`   配置名称: ${l04.configName}`);
      console.log(`   考勤代码: ${l04.sourceConfig?.attendanceCodes}`);
      const rule = l04.rules[0];
      console.log(`   分摊依据: ${rule.allocationBasis}`);
      console.log(`   分摊层级: ${rule.allocationHierarchyLevels}`);
    }
    console.log();

    // 3. 检查I04工时记录
    console.log('3. 检查I04工时记录 (2026-03-11):');
    const i04Results = await prisma.calcResult.findMany({
      where: {
        calcDate: new Date('2026-03-11'),
        attendanceCode: { code: 'I04' },
      },
      include: {
        employee: true,
      },
    });

    console.log(`   找到 ${i04Results.length} 条I04记录`);
    i04Results.forEach((r: any) => {
      console.log(`   - ${r.employeeNo}: ${r.shiftName} (${r.shiftId}), ${r.actualHours}h`);
    });

  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkL03L04Config();
