import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAllocationConfig() {
  console.log('🔍 验证工时基础配置\n');

  // 1. 检查通用配置
  console.log('1️⃣ 当前通用配置 (AllocationGeneralConfig):');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();

  if (generalConfig) {
    console.log(`  AL1001 (直接工时代码): ${generalConfig.actualHoursAllocationCode}`);
    console.log(`  AL1002 (间接工时代码): ${generalConfig.indirectHoursAllocationCode}`);

    // 2. 验证这些代码是否在DefinitionAttendanceCode表中存在
    console.log('\n2️⃣ 验证代码是否在DefinitionAttendanceCode表中:');
    const actualCode = await prisma.definitionAttendanceCode.findFirst({
      where: { code: generalConfig.actualHoursAllocationCode },
    });
    const indirectCode = await prisma.definitionAttendanceCode.findFirst({
      where: { code: generalConfig.indirectHoursAllocationCode },
    });

    console.log(`  ${generalConfig.actualHoursAllocationCode}: ${actualCode ? `✅ 存在 - ${actualCode.name}` : '❌ 不存在'}`);
    console.log(`  ${generalConfig.indirectHoursAllocationCode}: ${indirectCode ? `✅ 存在 - ${indirectCode.name}` : '❌ 不存在'}`);
  } else {
    console.log('  ❌ 未找到通用配置');
  }

  // 3. 显示DefinitionAttendanceCode表中的所有可用代码
  console.log('\n3️⃣ DefinitionAttendanceCode表中的所有可用代码:');
  const allCodes = await prisma.definitionAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      code: 'asc',
    },
  });

  for (const code of allCodes) {
    const isUsed = code.code === generalConfig?.actualHoursAllocationCode ||
                  code.code === generalConfig?.indirectHoursAllocationCode;
    console.log(`  ${code.code} - ${code.name}${isUsed ? ' ← 当前使用' : ''}`);
  }

  await prisma.$disconnect();
}

verifyAllocationConfig().catch(console.error);
