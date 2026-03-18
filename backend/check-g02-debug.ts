import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkG02Debug() {
  try {
    console.log('=== 检查G02配置和源数据 ===\n');

    // 1. 检查G02配置
    console.log('1. G02配置详情:');
    const config = await prisma.allocationConfig.findUnique({
      where: { id: 15 },
      include: {
        sourceConfig: true,
        rules: {
          where: { deletedAt: null, status: 'ACTIVE' },
          include: {
            targets: true,
          },
        },
      },
    });

    if (config) {
      console.log(`   配置代码: ${config.configCode}`);
      console.log(`   配置名称: ${config.configName}`);
      console.log(`   源类型: ${config.sourceConfig?.sourceType}`);
      console.log(`   考勤代码: ${config.sourceConfig?.attendanceCodes}`);
      console.log(`   账户过滤: ${config.sourceConfig?.accountFilter}`);
      console.log(`   员工过滤: ${config.sourceConfig?.employeeFilter}`);
      console.log(`   规则数量: ${config.rules.length}`);
      
      if (config.rules.length > 0) {
        const rule = config.rules[0];
        console.log(`\n   规则详情:`);
        console.log(`   - 规则名称: ${rule.ruleName}`);
        console.log(`   - 分摊依据: ${rule.allocationBasis}`);
        console.log(`   - 分摊范围ID: ${rule.allocationScopeId}`);
        console.log(`   - 分摊层级: ${rule.allocationHierarchyLevels}`);
      }
    }
    console.log();

    // 2. 检查源数据 - I05工时记录
    console.log('2. 检查I05工时记录 (2026-03-11):');
    const calcResults = await prisma.calcResult.findMany({
      where: {
        calcDate: new Date('2026-03-11'),
        attendanceCode: { code: 'I05' },
      },
      include: {
        employee: true,
        attendanceCode: true,
      },
    });

    console.log(`   找到 ${calcResults.length} 条I05工时记录:`);
    calcResults.forEach((r: any) => {
      console.log(`   - 员工: ${r.employee?.name} (${r.employeeNo}), 班次: ${r.shiftName} (ID:${r.shiftId}), 工时: ${r.actualHours}h, 账户: ${r.accountName}`);
    });

  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkG02Debug();
