import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentAllocationConfig() {
  console.log('🔍 查询当前数据库中的AL1001与AL1002参数值\n');

  // 查询AllocationGeneralConfig表
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();

  if (!generalConfig) {
    console.log('❌ 数据库中未找到通用配置记录');
    await prisma.$disconnect();
    return;
  }

  console.log('📋 AllocationGeneralConfig表数据:');
  console.log('═'.repeat(60));
  console.log(`ID: ${generalConfig.id}`);
  console.log(`\nAL1001 (直接工时代码):`);
  console.log(`  actualHoursAllocationCode: "${generalConfig.actualHoursAllocationCode}"`);

  console.log(`\nAL1002 (间接工时代码):`);
  console.log(`  indirectHoursAllocationCode: "${generalConfig.indirectHoursAllocationCode}"`);

  console.log(`\n其他信息:`);
  console.log(`  描述: ${generalConfig.description || '(无)'}`);
  console.log(`  最后更新时间: ${generalConfig.updatedAt}`);
  console.log(`  最后更新者: ${generalConfig.updatedByName || '(无)'}`);
  console.log('═'.repeat(60));

  // 验证这些代码在DefinitionAttendanceCode表中的详细信息
  console.log('\n📝 这些代码在DefinitionAttendanceCode表中的详细信息:');

  const actualCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: generalConfig.actualHoursAllocationCode },
  });

  const indirectCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: generalConfig.indirectHoursAllocationCode },
  });

  console.log('\nAL1001 (直接工时代码):');
  if (actualCode) {
    console.log(`  ✅ 找到记录`);
    console.log(`     ID: ${actualCode.id}`);
    console.log(`     代码: ${actualCode.code}`);
    console.log(`     名称: ${actualCode.name}`);
    console.log(`     状态: ${actualCode.status}`);
  } else {
    console.log(`  ❌ "${generalConfig.actualHoursAllocationCode}" 在DefinitionAttendanceCode表中不存在`);
  }

  console.log('\nAL1002 (间接工时代码):');
  if (indirectCode) {
    console.log(`  ✅ 找到记录`);
    console.log(`     ID: ${indirectCode.id}`);
    console.log(`     代码: ${indirectCode.code}`);
    console.log(`     名称: ${indirectCode.name}`);
    console.log(`     状态: ${indirectCode.status}`);
  } else {
    console.log(`  ❌ "${generalConfig.indirectHoursAllocationCode}" 在DefinitionAttendanceCode表中不存在`);
  }

  await prisma.$disconnect();
}

checkCurrentAllocationConfig().catch(console.error);
