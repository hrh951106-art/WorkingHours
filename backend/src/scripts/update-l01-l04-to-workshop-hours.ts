import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 将L01-L04规则的出勤代码改为车间工时(I04)
 */
async function updateL01L04ToWorkshopHours() {
  console.log('========================================');
  console.log('将L01-L04规则出勤代码改为车间工时');
  console.log('========================================\n');

  // 查询车间工时出勤代码
  const workshopAttendanceCode = await prisma.attendanceCode.findFirst({
    where: {
      code: 'I04',
      status: 'ACTIVE',
    },
  });

  if (!workshopAttendanceCode) {
    console.log('✗ 未找到车间工时出勤代码(I04)');
    await prisma.$disconnect();
    return;
  }

  console.log(`找到车间工时出勤代码:`);
  console.log(`  ID: ${workshopAttendanceCode.id}`);
  console.log(`  代码: ${workshopAttendanceCode.code}`);
  console.log(`  名称: ${workshopAttendanceCode.name}`);
  console.log(`  类型: ${workshopAttendanceCode.type}\n`);

  // 查询L01-L04规则配置
  const ruleCodes = ['L01', 'L02', 'L03', 'L04'];

  for (const ruleCode of ruleCodes) {
    console.log(`----------------------------------------`);
    console.log(`处理规则: ${ruleCode}`);
    console.log(`----------------------------------------`);

    // 查询配置
    const config = await prisma.allocationConfig.findFirst({
      where: {
        configCode: ruleCode,
        deletedAt: null,
      },
    });

    if (!config) {
      console.log(`✗ 未找到规则 ${ruleCode}\n`);
      continue;
    }

    console.log(`配置名称: ${config.configName}`);

    // 查询分摊规则
    const ruleConfigs = await prisma.allocationRuleConfig.findMany({
      where: {
        configId: config.id,
        deletedAt: null,
      },
    });

    if (ruleConfigs.length === 0) {
      console.log(`✗ 未找到分摊规则配置\n`);
      continue;
    }

    // 更新每个分摊规则的出勤代码
    for (const ruleConfig of ruleConfigs) {
      const oldCodes = JSON.parse(ruleConfig.allocationAttendanceCodes || '[]');
      console.log(`\n分摊规则: ${ruleConfig.ruleName || '无'} (ID: ${ruleConfig.id})`);
      console.log(`  旧出勤代码ID: ${oldCodes.length > 0 ? oldCodes.join(', ') : '无'}`);

      // 显示旧出勤代码的名称
      if (oldCodes.length > 0) {
        const oldCodeNames: string[] = [];
        for (const codeId of oldCodes) {
          const code = await prisma.attendanceCode.findUnique({
            where: { id: codeId },
          });
          if (code) {
            oldCodeNames.push(`${code.code}(${code.name})`);
          }
        }
        console.log(`  旧出勤代码: ${oldCodeNames.join(', ')}`);
      }

      // 更新为车间工时
      const newCodes = [workshopAttendanceCode.id];
      console.log(`  新出勤代码ID: ${newCodes.join(', ')}`);
      console.log(`  新出勤代码: ${workshopAttendanceCode.code}(${workshopAttendanceCode.name})`);

      await prisma.allocationRuleConfig.update({
        where: { id: ruleConfig.id },
        data: {
          allocationAttendanceCodes: JSON.stringify(newCodes),
        },
      });

      console.log(`  ✓ 更新成功`);
    }

    console.log();
  }

  console.log('========================================');
  console.log('更新完成');
  console.log('========================================\n');

  // 验证更新结果
  console.log('验证更新结果:\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  // 查询I04在该日期范围内的工时记录数
  const i04RecordCount = await prisma.calcResult.count({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
      attendanceCodeId: workshopAttendanceCode.id,
    },
  });

  console.log(`车间工时(I04)在指定日期范围内的工时记录数: ${i04RecordCount}\n`);

  if (i04RecordCount > 0) {
    console.log(`✓ 找到工时记录，规则应该能够正常执行分摊`);
  } else {
    console.log(`⚠ 该日期范围内没有车间工时(I04)的工时记录`);
    console.log(`   建议先生成车间工时的工时记录，或者调整日期范围`);
  }

  console.log('\n========================================\n');
  console.log('下一步操作:');
  console.log('1. 重启后端服务');
  console.log('2. 重新执行L01-L04分摊规则');
  console.log('3. 验证分摊结果\n');

  console.log('========================================\n');
}

updateL01L04ToWorkshopHours()
  .catch((e) => {
    console.error('更新失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
