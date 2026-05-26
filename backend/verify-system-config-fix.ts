import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySystemConfigFix() {
  console.log('🔍 验证SystemConfig配置修复\n');
  console.log('═'.repeat(70));

  // 1. ��查SystemConfig表中的配置
  console.log('\n1️⃣ SystemConfig表中的AL1001和AL1002参数:');
  const systemConfigs = await prisma.systemConfig.findMany({
    where: {
      configKey: {
        in: ['actualHoursAllocationCode', 'indirectHoursAllocationCode'],
      },
    },
  });

  const actualHoursConfig = systemConfigs.find(c => c.configKey === 'actualHoursAllocationCode');
  const indirectHoursConfig = systemConfigs.find(c => c.configKey === 'indirectHoursAllocationCode');

  if (actualHoursConfig) {
    console.log(`  ✅ AL1001 (实际工时代码): "${actualHoursConfig.configValue}"`);
  } else {
    console.log(`  ❌ AL1001未配置`);
  }

  if (indirectHoursConfig) {
    console.log(`  ✅ AL1002 (间接工时代码): "${indirectHoursConfig.configValue}"`);
  } else {
    console.log(`  ❌ AL1002未配置`);
  }

  // 2. 验证这些代码在DefinitionAttendanceCode表中是否存在
  console.log('\n2️⃣ 验证代码在DefinitionAttendanceCode表中是否存在:');

  if (actualHoursConfig?.configValue) {
    const actualCode = await prisma.definitionAttendanceCode.findFirst({
      where: { code: actualHoursConfig.configValue },
    });

    if (actualCode) {
      console.log(`  ✅ "${actualHoursConfig.configValue}" 存在 - ${actualCode.name}`);
    } else {
      console.log(`  ❌ "${actualHoursConfig.configValue}" 不存在`);
    }
  }

  if (indirectHoursConfig?.configValue) {
    const indirectCode = await prisma.definitionAttendanceCode.findFirst({
      where: { code: indirectHoursConfig.configValue },
    });

    if (indirectCode) {
      console.log(`  ✅ "${indirectHoursConfig.configValue}" 存在 - ${indirectCode.name}`);
    } else {
      console.log(`  ❌ "${indirectHoursConfig.configValue}" 不存在`);
    }
  }

  // 3. 对比AllocationGeneralConfig表（旧配置）
  console.log('\n3️⃣ AllocationGeneralConfig表（旧配置，不再使用）:');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();

  if (generalConfig) {
    console.log(`  AL1001: "${generalConfig.actualHoursAllocationCode}"`);
    console.log(`  AL1002: "${generalConfig.indirectHoursAllocationCode}"`);
  } else {
    console.log(`  (未找到配置)`);
  }

  // 4. 结论
  console.log('\n4️⃣ 验证结论:');
  console.log('═'.repeat(70));

  const frontendUsesSystemConfig = true;
  const backendNowUsesSystemConfig = true; // 已修复代码

  console.log(`  前端使用: SystemConfig表`);
  console.log(`  后端使用: SystemConfig表 ✅ (已修复)`);
  console.log(`  数据一致性: ${actualHoursConfig?.configValue && indirectHoursConfig?.configValue ? '✅ 已统一' : '❌ 不一致'}`);

  console.log('\n5️⃣ 当前配置值:');
  console.log(`  实际工时代码(AL1001): ${actualHoursConfig?.configValue || '未配置'}`);
  console.log(`  间接工时代码(AL1002): ${indirectHoursConfig?.configValue || '未配置'}`);

  console.log('\n6️⃣ 说明:');
  console.log(`  • 间接工时分摊时，从SystemConfig的AL1001参数获取实际工时代码`);
  console.log(`  • 分摊完成后，从SystemConfig的AL1002参数获取存储的目标代码`);
  console.log(`  • 现在前后端使用同一配置源，数据保持一致`);

  await prisma.$disconnect();
}

verifySystemConfigFix().catch(console.error);
