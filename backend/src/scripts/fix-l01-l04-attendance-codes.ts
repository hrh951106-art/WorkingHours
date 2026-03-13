import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 为L01-L04规则配置出勤代码
 * 根据规则类型和业务逻辑，配置合适的出勤代码
 */
async function fixL01L04AttendanceCodes() {
  console.log('========================================');
  console.log('为L01-L04规则配置出勤代码');
  console.log('========================================\n');

  // 获取所有出勤代码
  const allAttendanceCodes = await prisma.attendanceCode.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      code: 'asc',
    },
  });

  console.log('系统中的出勤代码:\n');
  for (const code of allAttendanceCodes) {
    console.log(`  ID: ${code.id}, 代码: ${code.code}, 名称: ${code.name}, 类型: ${code.type}`);
  }

  // 定义每个规则应该配置的出勤代码
  const ruleAttendanceCodes = {
    'L01': ['I01', 'I02', 'I03'], // 实际工时 - 使用线体工时相关代码
    'L02': ['I01', 'I02', 'I03'], // 实际产量分摊 - 使用线体工时
    'L03': ['I01', 'I02', 'I03'], // 同效产量分摊 - 使用线体工时
    'L04': ['I01', 'I02', 'I03'], // 标准工时分摊 - 使用线体工时
  };

  console.log('\n========================================\n');
  console.log('配置建议:\n');

  for (const [ruleCode, codes] of Object.entries(ruleAttendanceCodes)) {
    console.log(`${ruleCode}: ${codes.join(', ')}`);
  }

  console.log('\n========================================\n');
  console.log('开始配置...\n');

  // 查询每个规则的配置
  const ruleConfigs = await prisma.allocationConfig.findMany({
    where: {
      configCode: {
        in: Object.keys(ruleAttendanceCodes),
      },
      deletedAt: null,
    },
  });

  for (const config of ruleConfigs) {
    const ruleCode = config.configCode;
    const attendanceCodeNames = ruleAttendanceCodes[ruleCode as keyof typeof ruleAttendanceCodes];

    if (!attendanceCodeNames) {
      console.log(`✗ 跳过 ${ruleCode}: 未定义出勤代码配置`);
      continue;
    }

    console.log(`----------------------------------------`);
    console.log(`处理规则: ${ruleCode} - ${config.configName}`);
    console.log(`----------------------------------------`);

    // 查询出勤代码ID
    const attendanceCodeIds: number[] = [];
    for (const codeName of attendanceCodeNames) {
      const code = await prisma.attendanceCode.findFirst({
        where: {
          code: codeName,
          status: 'ACTIVE',
        },
      });

      if (code) {
        attendanceCodeIds.push(code.id);
        console.log(`  找到出勤代码: ${codeName} (ID: ${code.id})`);
      } else {
        console.log(`  ⚠ 未找到出勤代码: ${codeName}`);
      }
    }

    if (attendanceCodeIds.length === 0) {
      console.log(`  ✗ 没有找到任何出勤代码，跳过\n`);
      continue;
    }

    // 查询该配置的分摊规则
    const ruleConfigs = await prisma.allocationRuleConfig.findMany({
      where: {
        configId: config.id,
        deletedAt: null,
      },
    });

    if (ruleConfigs.length === 0) {
      console.log(`  ✗ 未找到分摊规则配置\n`);
      continue;
    }

    // 更新每个分摊规则的出勤代码
    for (const ruleConfig of ruleConfigs) {
      console.log(`  更新分摊规则: ${ruleConfig.ruleName || '无'} (ID: ${ruleConfig.id})`);

      const oldCodes = JSON.parse(ruleConfig.allocationAttendanceCodes || '[]');
      console.log(`    旧出勤代码: ${oldCodes.length > 0 ? oldCodes.join(', ') : '无'}`);
      console.log(`    新出勤代码: ${attendanceCodeIds.join(', ')}`);

      await prisma.allocationRuleConfig.update({
        where: { id: ruleConfig.id },
        data: {
          allocationAttendanceCodes: JSON.stringify(attendanceCodeIds),
        },
      });

      console.log(`    ✓ 更新成功`);
    }

    console.log();
  }

  console.log('========================================');
  console.log('配置完成');
  console.log('========================================\n');

  console.log('下一步操作:');
  console.log('1. 重启后端服务');
  console.log('2. 重新执行L01-L04分摊规则');
  console.log('3. 验证分摊结果\n');

  console.log('========================================\n');
}

fixL01L04AttendanceCodes()
  .catch((e) => {
    console.error('配置失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
