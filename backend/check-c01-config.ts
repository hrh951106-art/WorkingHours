import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkC01Config() {
  try {
    console.log('=== 查询C01分摊配置 ===\n');

    // 查询C01配置
    const config = await prisma.allocationConfig.findFirst({
      where: {
        configCode: 'C01',
        deletedAt: null,
      },
      include: {
        sourceConfig: true,
        rules: {
          where: { deletedAt: null },
          include: {
            targets: true,
          },
        },
      },
    });

    if (!config) {
      console.log('未找到C01配置');
      return;
    }

    console.log('配置信息:');
    console.log(`- 配置编码: ${config.configCode}`);
    console.log(`- 配置名称: ${config.configName}`);
    console.log(`- 组织ID: ${config.orgId}`);
    console.log(`- 状态: ${config.status}`);
    console.log(`- 生效时间: ${config.effectiveStartTime}`);
    console.log();

    if (config.sourceConfig) {
      console.log('分摊源配置:');
      const sourceConfig = config.sourceConfig as any;
      console.log(`- 源类型: ${sourceConfig.sourceType}`);
      console.log(`- 员工过滤: ${sourceConfig.employeeFilter}`);
      console.log(`- 科目过滤: ${sourceConfig.accountFilter}`);
      console.log(`- 出勤代码: ${sourceConfig.attendanceCodes}`);
      console.log();
    }

    console.log(`分摊规则数量: ${config.rules.length}`);
    config.rules.forEach((rule: any, index: number) => {
      console.log(`\n规则 ${index + 1}:`);
      console.log(`- 规则名称: ${rule.ruleName}`);
      console.log(`- 规则类型: ${rule.ruleType}`);
      console.log(`- 分摊基础: ${rule.allocationBasis}`);
      console.log(`- 分摊层级: ${rule.allocationHierarchyLevels}`);
      console.log(`- 分摊范围ID: ${rule.allocationScopeId}`);
      console.log(`- 状态: ${rule.status}`);
      console.log(`- 目标数量: ${rule.targets.length}`);
    });

  } catch (error) {
    console.error('查询失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkC01Config();
