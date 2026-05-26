import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查映射关系 ===\n');

  // 1. 获取所有 CalcResult
  const calcResults = await prisma.calcResult.findMany({
    include: {
      calculationAttendanceCode: true
    }
  });

  console.log(`CalcResult 数据 (${calcResults.length} 条):\n`);
  calcResults.forEach(result => {
    const code = result.calculationAttendanceCode?.code || 'N/A';
    const name = result.calculationAttendanceCode?.name || 'N/A';
    console.log(`  ID: ${result.id}, 员工: ${result.employeeNo}, 代码: ${code} (${name}), 工时: ${result.actualHours}`);
  });

  // 2. 获取所有 DefinitionAttendanceCode
  const defCodes = await prisma.definitionAttendanceCode.findMany({
    where: { status: 'ACTIVE' }
  });

  console.log('\nDefinitionAttendanceCode 映射:\n');
  defCodes.forEach(def => {
    console.log(`  ${def.code} (${def.name}) -> calcAttendanceCode: ${def.calcAttendanceCode || 'NULL'}`);
  });

  // 3. 检查映射关系
  console.log('\n=== 映射检查 ===\n');
  calcResults.forEach(result => {
    const code = result.calculationAttendanceCode?.code;
    const hasMapping = defCodes.some(def => def.calcAttendanceCode === code);
    console.log(`${code}: ${hasMapping ? '✅ 有映射' : '❌ 无映射'}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
