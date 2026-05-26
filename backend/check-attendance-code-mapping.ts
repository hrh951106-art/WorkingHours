import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAttendanceCodeMapping() {
  console.log('🔍 检查考勤代码映射问题\n');

  // 1. 检查CalculationAttendanceCode表中的所有代码
  console.log('1️⃣ CalculationAttendanceCode表中的所有代码:');
  const allCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      code: 'asc',
    },
  });

  console.log(`总共找到 ${allCodes.length} 个考勤代码\n`);
  for (const code of allCodes) {
    console.log(`  ID: ${code.id}, Code: ${code.code}, Name: ${code.name}`);
  }

  // 2. 查找A04和A04_WORKSHOP
  console.log('\n2️⃣ 查找A04相关代码:');
  const a04Codes = allCodes.filter(c =>
    c.code.includes('A04') ||
    c.name.includes('车间')
  );

  if (a04Codes.length > 0) {
    console.log(`找到 ${a04Codes.length} 个A04相关代码:`);
    for (const code of a04Codes) {
      console.log(`  ID: ${code.id}, Code: ${code.code}, Name: ${code.name}`);
    }
  } else {
    console.log('❌ 未找到A04相关代码！');
  }

  // 3. 检查配置中使用的A04_WORKSHOP是否存在
  console.log('\n3️⃣ 检查配置中使用的A04_WORKSHOP:');
  const a04Workshop = await prisma.calculationAttendanceCode.findFirst({
    where: {
      code: 'A04_WORKSHOP',
    },
  });

  if (a04Workshop) {
    console.log('✅ 找到A04_WORKSHOP:');
    console.log(`  ID: ${a04Workshop.id}, Code: ${a04Workshop.code}, Name: ${a04Workshop.name}`);
  } else {
    console.log('❌ 未找到A04_WORKSHOP代码！');
    console.log('   这就是问题所在：配置中使用了不存在的考勤代码！');
  }

  // 4. 检查CalcResult表中A04数据对应的code
  console.log('\n4️⃣ 检查CalcResult表中A04数据:');
  const a04CalcResults = await prisma.calcResult.findMany({
    where: {
      calculationAttendanceCodeId: 3, // 之前查询到A04的ID是3
    },
    take: 3,
  });

  if (a04CalcResults.length > 0) {
    console.log('找到A04的CalcResult数据，关联的CalculationAttendanceCode:');
    const a04Code = await prisma.calculationAttendanceCode.findUnique({
      where: {
        id: 3,
      },
    });
    if (a04Code) {
      console.log(`  ID: ${a04Code.id}, Code: ${a04Code.code}, Name: ${a04Code.name}`);
    }

    console.log('\n示例数据:');
    for (const result of a04CalcResults) {
      console.log(`  员工: ${result.employeeNo}, 工时: ${result.actualHours}, 日期: ${result.calcDate}`);
    }
  }

  // 5. 检查分摊配置中使用的代码
  console.log('\n5️⃣ 配置不匹配分析:');
  console.log('  配置文件中使用的代码: "A04_WORKSHOP"');
  console.log('  CalcResult表中的代码ID: 3');

  const codeById3 = await prisma.calculationAttendanceCode.findUnique({
    where: { id: 3 },
  });

  if (codeById3) {
    console.log(`  ID=3对应的代码: "${codeById3.code}"`);
    console.log('\n  ❌ 问题原因:');
    console.log('     配置中使用的是 "A04_WORKSHOP"');
    console.log(`     但实际的CalcResult表中的考勤代码是 "${codeById3.code}"`);
    console.log('     两者不匹配，导致无法查询到数据！');
  }

  await prisma.$disconnect();
}

checkAttendanceCodeMapping().catch(console.error);
