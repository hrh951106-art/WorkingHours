import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkA04Config() {
  console.log('=== 检查配置代码为A04的配置 ===\n');

  const a04Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A04',
      deletedAt: null
    },
    include: {
      rules: {
        include: {
          targets: true
        }
      },
      sourceConfig: true
    }
  });

  if (!a04Config) {
    console.log('❌ 没有找到配置代码为A04的配置');

    // 列出所有配置
    console.log('\n所有AllocationConfig:');
    const allConfigs = await prisma.allocationConfig.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        configCode: true,
        configName: true,
        status: true
      },
      orderBy: { id: 'asc' }
    });

    allConfigs.forEach(config => {
      console.log(\`  ID=\${config.id}, code=\${config.configCode}, name=\${config.configName}, status=\${config.status}\`);
    });

    return;
  }

  console.log('✅ 找到A04配置:');
  console.log(\`  配置ID: \${a04Config.id}\`);
  console.log(\`  配置代码: \${a04Config.configCode}\`);
  console.log(\`  配置名称: \${a04Config.configName}\`);
  console.log(\`  状态: \${a04Config.status}\`);
  console.log(\`  规则数量: \${a04Config.rules.length}\`);

  if (a04Config.rules.length > 0) {
    console.log('\n规则详情:');
    for (let i = 0; i < a04Config.rules.length; i++) {
      const rule = a04Config.rules[i];
      console.log(\`\n  规则 \${i + 1} (ID: \${rule.id}):\`);
      console.log(\`    规则名称: \${rule.ruleName || '未命名'}\`);
      console.log(\`    规则类型: \${rule.ruleType}\`);
      console.log(\`    分摊依据: \${rule.allocationBasis}\`);
      console.log(\`    考勤代码过滤: \${rule.allocationAttendanceCodes}\`);

      // 解析考勤代码
      const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
      if (attendanceCodes.length > 0) {
        console.log(\`    配置的考勤代码ID: \${attendanceCodes.join(', ')}\`);
      }

      console.log(\`    归属层级: \${rule.allocationHierarchyLevels}\`);
      console.log(\`    分配范围ID: \${rule.allocationScopeId || '未配置'}\`);
      console.log(\`    分配目标数量: \${rule.targets ? rule.targets.length : 0}\`);

      if (rule.targets && rule.targets.length > 0) {
        rule.targets.forEach((target, tIndex) => {
          console.log(\`\n      目标 \${tIndex + 1}:\`);
          console.log(\`        类型: \${target.targetType}\`);
          console.log(\`        ID: \${target.targetId}\`);
          console.log(\`        账户ID: \${target.accountId}\`);
        });
      }
    }
  }

  console.log('\n=== 检查完成 ===');
}

checkA04Config()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
