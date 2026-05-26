import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAttendanceCodeTables() {
  console.log('=== 考勤代码表结构分析 ===\n');

  // 1. AttendanceCode表
  console.log('1. AttendanceCode表（主考勤代码表）:');
  const attendanceCodes = await prisma.attendanceCode.findMany({
    orderBy: { code: 'asc' }
  });

  console.log(`  总记录数: ${attendanceCodes.length}`);
  console.log('\n  所有考勤代码:');
  attendanceCodes.forEach(code => {
    console.log(`    ${code.code} - ${code.name}`);
    console.log(`      类型: ${code.type}, 单位: ${code.unit}`);
    console.log(`      状态: ${code.status}`);
  });

  // 2. CalculationAttendanceCode表
  console.log('\n2. CalculationAttendanceCode表（计算考勤代码表）:');
  const calcAttendanceCodes = await prisma.calculationAttendanceCode.findMany();

  console.log(`  总记录数: ${calcAttendanceCodes.length}`);
  if (calcAttendanceCodes.length > 0) {
    console.log('\n  所有记录:');
    calcAttendanceCodes.forEach((code, index) => {
      console.log(`    [${index + 1}]`);
      console.log(`      ID: ${code.id}`);
      console.log(`      名称: ${code.name}`);
      console.log(`      代码字段: ${code.codeField || '无'}`);
      console.log(`      名称字段: ${code.nameField || '无'}`);
      console.log(`      描述: ${code.description || '无'}`);
      console.log(`      状态: ${code.status}`);
    });
  } else {
    console.log('  表为空');
  }

  // 3. DefinitionAttendanceCode表
  console.log('\n3. DefinitionAttendanceCode表（定义考勤代码表）:');
  const definitionAttendanceCodes = await prisma.definitionAttendanceCode.findMany({
    orderBy: { id: 'asc' }
  });

  console.log(`  总记录数: ${definitionAttendanceCodes.length}`);
  if (definitionAttendanceCodes.length > 0) {
    console.log('\n  所有记录:');
    definitionAttendanceCodes.forEach((code, index) => {
      console.log(`    [${index + 1}]`);
      console.log(`      ID: ${code.id}`);
      console.log(`      考勤代码: ${code.attendanceCode}`);
      console.log(`      显示名称: ${code.displayName || '无'}`);
      console.log(`      描述: ${code.description || '无'}`);
      console.log(`      状态: ${code.status}`);
    });
  } else {
    console.log('  表为空');
  }

  // 4. 对比分析
  console.log('\n4. 三张表的用途分析:\n');

  console.log('AttendanceCode（主表）:');
  console.log('  - 用途: 系统中使用的标准考勤代码定义');
  console.log('  - 包含: 代码、名称、类型、单位、状态等');
  console.log('  - 数据: A01-A04、ALLOCATION_WORK等共10条');
  console.log('  - 关联: CalcResult.calcResult');

  console.log('\nCalculationAttendanceCode（计算用）:');
  console.log('  - 用途: 工时计算时使用的考勤代码定义');
  console.log('  - 包含: 名称、代码字段名、名称字段名等');
  console.log(`  - 数据: ${calcAttendanceCodes.length}条`);
  console.log('  - 说明: 用于定义如何从数据源读取考勤代码');

  console.log('\nDefinitionAttendanceCode（定义用）:');
  console.log('  - 用途: 前端显示/配置用的考勤代码定义');
  console.log('  - 包含: 考勤代码、显示名称、描述等');
  console.log(`  - 数据: ${definitionAttendanceCodes.length}条`);
  console.log('  - 说明: 用于前端下拉框、配置界面等');

  console.log('\n5. 表之间的关系:\n');

  console.log('数据流向:');
  console.log('  DefinitionAttendanceCode（前端配置）');
  console.log('           ↓');
  console.log('  AttendanceCode（系统标准定义）');
  console.log('           ↓');
  console.log('  CalcResult.attendanceCodeId（计算结果关联）');

  console.log('\n6. 表结构对比:\n');

  // 检查表中是否有A04
  const a04InAttendanceCode = attendanceCodes.find(c => c.code === 'A04');
  const a04InCalcCode = calcAttendanceCodes.find(c => c.codeField === 'A04' || c.name?.includes('A04'));
  const a04InDefCode = definitionAttendanceCodes.find(c => c.attendanceCode === 'A04');

  console.log('A04考勤代码在各表中的情况:');
  console.log(`  AttendanceCode: ${a04InAttendanceCode ? '✅ 存在 - ' + a04InAttendanceCode.name : '❌ 不存在'}`);
  console.log(`  CalculationAttendanceCode: ${a04InCalcCode ? '✅ 存在 - ' + a04InCalcCode.name : '❌ 不存在'}`);
  console.log(`  DefinitionAttendanceCode: ${a04InDefCode ? '✅ 存在 - ' + a04InDefCode.displayName : '❌ 不存在'}`);

  console.log('\n=== 检查完成 ===');
}

checkAttendanceCodeTables()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
