import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function checkG02Details() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 检查G02配置详情 ===\n');

  // 获取G02配置
  const config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'G02',
      deletedAt: null,
    },
  }) as any;

  // 获取规则
  const rules = await prisma.allocationRuleConfig.findMany({
    where: {
      configId: config.id,
      deletedAt: null,
    },
  });

  if (!config) {
    console.log('未找到G02配置');
    await app.close();
    return;
  }

  console.log('配置信息:');
  console.log(`  ID: ${config.id}`);
  console.log(`  编码: ${config.configCode}`);
  console.log(`  名称: ${config.configName}`);
  console.log(`  状态: ${config.status}`);
  console.log(`  描述: ${config.description || '无'}`);

  console.log('\n分摊源配置:');
  const sourceConfig = await prisma.allocationSourceConfig.findFirst({
    where: { configId: config.id },
  });
  if (sourceConfig) {
    console.log(`  源类型: ${sourceConfig.sourceType}`);
    console.log(`  出勤代码: ${sourceConfig.attendanceCodes}`);
    console.log(`  员工筛选: ${sourceConfig.employeeFilter || '无'}`);
    console.log(`  账户筛选: ${sourceConfig.accountFilter || '无'}`);
  }

  console.log('\n分摊规则:');
  if (rules && rules.length > 0) {
    for (const rule of rules) {
      console.log(`\n  规则ID: ${rule.id}`);
      console.log(`  规则名称: ${rule.ruleName}`);
      console.log(`  规则类型: ${rule.ruleType}`);
      console.log(`  分摊基础: ${rule.allocationBasis}`);
      console.log(`  分摊范围ID: ${rule.allocationScopeId || '未设置'}`);
      console.log(`  状态: ${rule.status}`);

      if (rule.allocationScopeId) {
        console.log('\n  获取分摊范围配置详情...');
        const scopeConfig = await prisma.accountHierarchyConfig.findUnique({
          where: { id: rule.allocationScopeId },
        });
        if (scopeConfig) {
          console.log(`    层级ID: ${scopeConfig.id}`);
          console.log(`    层级级别: ${scopeConfig.level}`);
          console.log(`    层级名称: ${scopeConfig.name}`);
          console.log(`    映射类型: ${scopeConfig.mappingType}`);
          console.log(`    映射值: ${scopeConfig.mappingValue || '无'}`);
        }
      }

      console.log(`  出勤代码: ${rule.allocationAttendanceCodes}`);
      console.log(`  层级级别: ${rule.allocationHierarchyLevels}`);
      console.log(`  基础筛选: ${rule.basisFilter || '无'}`);
    }
  } else {
    console.log('  无分摊规则');
  }

  console.log('\n=== 检查待分摊的工时记录 ===');
  if (sourceConfig) {
    const attendanceCodes = JSON.parse(sourceConfig.attendanceCodes || '[]');
    console.log(`\n出勤代码: ${attendanceCodes.join(', ')}`);

    // 查询这些出勤代码的工时记录
    const attendanceCodeIds = await prisma.attendanceCode.findMany({
      where: {
        code: { in: attendanceCodes },
      },
      select: { id: true, code: true, name: true },
    });

    console.log(`出勤代码IDs: ${attendanceCodeIds.map(ac => `${ac.code}(${ac.id})`).join(', ')}`);

    if (attendanceCodeIds.length > 0) {
      const codes = attendanceCodeIds.map(ac => ac.id);
      const calcResults = await prisma.calcResult.findMany({
        where: {
          attendanceCodeId: { in: codes },
        },
        take: 10,
        orderBy: { calcDate: 'desc' },
      });

      console.log(`\n找到 ${calcResults.length} 条工时记录（显示前10条）:`);
      for (const result of calcResults) {
        const account = await prisma.laborAccount.findUnique({
          where: { id: result.accountId },
          select: {
            id: true,
            code: true,
            name: true,
            hierarchyValues: true,
          },
        });

        console.log(`  - ID: ${result.id}`);
        console.log(`    账户: ${account?.name} (${account?.code})`);
        console.log(`    计算日期: ${result.calcDate.toISOString().split('T')[0]}`);
        console.log(`    状态: ${result.status}`);
        console.log(`    标准工时: ${result.standardHours}, 实际工时: ${result.actualHours}`);
        console.log(`    hierarchyValues: ${account?.hierarchyValues?.substring(0, 150)}...`);
        console.log('');
      }
    }
  }

  await app.close();
}

checkG02Details().catch(console.error);
