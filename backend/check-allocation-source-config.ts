import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSourceConfig() {
  console.log('🔍 检查分摊数据源配置中的出勤代码\n');

  // 检查配置ID=2的数据源配置
  const sourceConfig = await prisma.allocationSourceConfig.findUnique({
    where: {
      configId: 2,
    },
  });

  if (sourceConfig) {
    console.log('✅ 找到数据源配置:');
    console.log('  - sourceType:', sourceConfig.sourceType);
    console.log('  - attendanceCodes (原始值):', sourceConfig.attendanceCodes);

    try {
      const attendanceCodes = JSON.parse(sourceConfig.attendanceCodes || '[]');
      console.log('  - attendanceCodes (解析后):', attendanceCodes);
      console.log('  - 出勤代码数量:', attendanceCodes.length);

      if (attendanceCodes.length > 0) {
        console.log('\n  📋 配置的出勤代码列表:');
        for (let i = 0; i < attendanceCodes.length; i++) {
          const code = attendanceCodes[i];
          console.log(`    ${i + 1}. ${JSON.stringify(code)}`);

          // 如果是ID，查询对应的考勤代码
          if (typeof code === 'number') {
            const attendanceCode = await prisma.calculationAttendanceCode.findUnique({
              where: { id: code },
            });
            if (attendanceCode) {
              console.log(`       代码: ${attendanceCode.code}, 名称: ${attendanceCode.name}`);
            }
          }
        }
      } else {
        console.log('  ⚠️ 出勤代码列表为空！');
      }
    } catch (e) {
      console.log('  ❌ 解析attendanceCodes失败:', e);
    }

    console.log('\n  - employeeFilter:', sourceConfig.employeeFilter);
    console.log('  - accountFilter:', sourceConfig.accountFilter);
    console.log('  - description:', sourceConfig.description);
  } else {
    console.log('❌ 未找到配置ID=2的数据源配置！');
  }

  // 检查所有数据源配置
  console.log('\n\n🔍 检查所有分摊配置的数据源配置:');
  const allSourceConfigs = await prisma.allocationSourceConfig.findMany();
  console.log(`总共找到 ${allSourceConfigs.length} 个数据源配置\n`);

  for (const config of allSourceConfigs) {
    console.log(`\n配置ID: ${config.configId}`);
    console.log(`  sourceType: ${config.sourceType}`);
    console.log(`  attendanceCodes: ${config.attendanceCodes}`);
    try {
      const parsed = JSON.parse(config.attendanceCodes || '[]');
      console.log(`  解析后: ${JSON.stringify(parsed)}`);
    } catch (e) {
      console.log(`  解析失败`);
    }
  }

  await prisma.$disconnect();
}

checkSourceConfig().catch(console.error);
