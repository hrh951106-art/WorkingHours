import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function listAllAllocationConfigs() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 列出所有分摊配置 ===\n');

  const configs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
      sourceConfig: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`总配置数: ${configs.length}\n`);

  for (const config of configs) {
    console.log(`\n配置名称: ${config.configName}`);
    console.log(`  状态: ${config.status}`);
    console.log(`  生效时间: ${config.effectiveStartTime} ~ ${config.effectiveEndTime || '无限制'}`);
    console.log(`  规则数: ${config.rules.length}`);

    for (const rule of config.rules) {
      console.log(`\n  规则详情:`);
      console.log(`    规则名称: ${rule.ruleName || 'N/A'}`);
      console.log(`    分摊依据: ${rule.allocationBasis}`);
      console.log(`    分摊范围ID: ${rule.allocationScopeId || '未配置'}`);

      // 获取层级配置的名称
      if (rule.allocationScopeId) {
        const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
          where: { id: rule.allocationScopeId },
        });
        console.log(`    分摊范围名称: ${hierarchyConfig?.name || 'N/A'}`);
      }

      console.log(`    分摊出勤代码: ${rule.allocationAttendanceCodes}`);
      console.log(`    分摊层级: ${rule.allocationHierarchyLevels}`);
    }

    if (config.sourceConfig) {
      console.log(`\n  分摊源配置:`);
      console.log(`    源类型: ${config.sourceConfig.sourceType}`);
      console.log(`    出勤代码: ${config.sourceConfig.attendanceCodes}`);
    }
  }

  console.log('\n=== 检查完成 ===');

  await app.close();
}

listAllAllocationConfigs().catch(console.error);
