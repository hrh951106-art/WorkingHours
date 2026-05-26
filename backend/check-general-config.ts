import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGeneralConfig() {
  console.log('🔍 检查通用配置和考勤代码\n');

  // 1. 检查通用配置
  console.log('1️⃣ 通用配置 (AllocationGeneralConfig):');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();

  if (generalConfig) {
    console.log(`  直接工时代码: ${generalConfig.actualHoursAllocationCode}`);
    console.log(`  间接工时代码: ${generalConfig.indirectHoursAllocationCode}`);
  } else {
    console.log('  ❌ 未找到通用配置');
  }

  // 2. 检查DefinitionAttendanceCode表中的代码
  console.log('\n2️⃣ DefinitionAttendanceCode表中的所有代码:');
  const allCodes = await prisma.definitionAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      code: 'asc',
    },
  });

  for (const code of allCodes) {
    console.log(`  ${code.code} - ${code.name} (ID: ${code.id})`);
  }

  // 3. 检查A01和A02是否存在
  console.log('\n3️⃣ 检查A01和A02:');
  const a01Code = await prisma.definitionAttendanceCode.findFirst({
    where: { code: 'A01' },
  });
  const a02Code = await prisma.definitionAttendanceCode.findFirst({
    where: { code: 'A02' },
  });
  const a02LineCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: 'A02_LINE' },
  });

  console.log(`  A01: ${a01Code ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`  A02: ${a02Code ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`  A02_LINE: ${a02LineCode ? '✅ 存在' : '❌ 不存在'}`);

  // 4. 建议
  console.log('\n4️⃣ 问题分析:');
  if (generalConfig) {
    if (generalConfig.actualHoursAllocationCode === 'A01' && !a01Code) {
      console.log('  ❌ 直接工时代码 A01 在DefinitionAttendanceCode表中不存在');
      console.log('  建议：改为使用 A01_PROCESS');
    }
    if (generalConfig.indirectHoursAllocationCode === 'A02' && !a02Code) {
      console.log('  ❌ 间接工时代码 A02 在DefinitionAttendanceCode表中不存在');
      console.log('  建议：改为使用 A02_LINE');
    }
  }

  await prisma.$disconnect();
}

checkGeneralConfig().catch(console.error);
