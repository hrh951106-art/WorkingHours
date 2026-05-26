import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllCodeTables() {
  console.log('🔍 查询工时结果表与所有出勤代码表\n');

  // 1. 查询WorkHourResult表
  console.log('1️⃣ WorkHourResult表（工时结果表）:');
  const workHourResults = await prisma.workHourResult.findMany({
    orderBy: {
      calcDate: 'desc',
    },
    take: 10,
  });

  console.log(`总记录数: 查询前10条\n`);
  for (const result of workHourResults) {
    console.log(`  ID: ${result.id}`);
    console.log(`  员工: ${result.employeeNo}`);
    console.log(`  计算日期: ${result.calcDate}`);
    console.log(`  考勤代码ID(旧): ${result.attendanceCodeId}`);
    console.log(`  定义考勤代码ID: ${result.definitionAttendanceCodeId}`);
    console.log(`  计算考勤代码: ${result.calcAttendanceCode}`);
    console.log(`  工时: ${result.workHours}`);
    console.log(`  金额: ${result.amount}`);
    console.log('  ---');
  }

  // 2. 查询AttendanceCode表（旧表）
  console.log('\n\n2️⃣ AttendanceCode表（出勤代码表-旧）:');
  const attendanceCodes = await prisma.attendanceCode.findMany({
    orderBy: {
      code: 'asc',
    },
  });

  console.log(`总记录数: ${attendanceCodes.length}\n`);
  for (const code of attendanceCodes) {
    console.log(`  ID: ${code.id}, Code: ${code.code}, Name: ${code.name}, Status: ${code.status}`);
  }

  // 3. 查询CalculationAttendanceCode表（新表）
  console.log('\n\n3️⃣ CalculationAttendanceCode表（计算考勤代码表-新）:');
  const calculationAttendanceCodes = await prisma.calculationAttendanceCode.findMany({
    orderBy: {
      code: 'asc',
    },
  });

  console.log(`总记录数: ${calculationAttendanceCodes.length}\n`);
  for (const code of calculationAttendanceCodes) {
    console.log(`  ID: ${code.id}, Code: ${code.code}, Name: ${code.name}, Status: ${code.status}`);
  }

  // 4. 查询DefinitionAttendanceCode表
  console.log('\n\n4️⃣ DefinitionAttendanceCode表（定义考勤代码表）:');
  const definitionAttendanceCodes = await prisma.definitionAttendanceCode.findMany({
    orderBy: {
      code: 'asc',
    },
  });

  console.log(`总记录数: ${definitionAttendanceCodes.length}\n`);
  for (const code of definitionAttendanceCodes) {
    console.log(`  ID: ${code.id}, Code: ${code.code}, Name: ${code.name}, Status: ${code.status}`);
  }

  // 5. 分析WorkHourResult中使用的代码ID
  console.log('\n\n5️⃣ WorkHourResult使用的考勤代码统计:');

  // 获取所有WorkHourResult中的不同attendanceCodeId
  const workHourCodeIds = await prisma.workHourResult.groupBy({
    by: ['attendanceCodeId', 'definitionAttendanceCodeId', 'calcAttendanceCode'],
    _count: {
      id: true,
    },
    where: {
      attendanceCodeId: {
        not: null,
      },
    },
  });

  console.log('\n按attendanceCodeId分组:');
  for (const group of workHourCodeIds) {
    const attendanceCode = await prisma.attendanceCode.findUnique({
      where: { id: group.attendanceCodeId || 0 },
    });

    const defCode = group.definitionAttendanceCodeId
      ? await prisma.definitionAttendanceCode.findUnique({
          where: { id: group.definitionAttendanceCodeId || 0 },
        })
      : null;

    console.log(`  attendanceCodeId=${group.attendanceCodeId}: ${group._count.id}条记录`);
    console.log(`    旧表对应: ${attendanceCode ? `${attendanceCode.code} - ${attendanceCode.name}` : '未找到'}`);
    console.log(`    定义表对应: ${defCode ? `${defCode.code} - ${defCode.name}` : '未找到'}`);
    console.log(`    计算代码: ${group.calcAttendanceCode}`);
  }

  // 6. 对比三个表的代码
  console.log('\n\n6️⃣ 三个考勤代码表的对比分析:');

  console.log('\n📋 代码对照表:');
  console.log('┌─────────┬──────────────────┬─────────────────────┬──────────────────────┐');
  console.log('│ 代码    │ AttendanceCode   │ CalculationAttCode  │ DefinitionAttCode    │');
  console.log('├─────────┼──────────────────┼─────────────────────┼──────────────────────┤');

  const allCodes = new Set([
    ...attendanceCodes.map(c => c.code),
    ...calculationAttendanceCodes.map(c => c.code),
    ...definitionAttendanceCodes.map(c => c.code),
  ]);

  for (const code of Array.from(allCodes).sort()) {
    const ac = attendanceCodes.find(c => c.code === code);
    const cac = calculationAttendanceCodes.find(c => c.code === code);
    const dac = definitionAttendanceCodes.find(c => c.code === code);

    const acStr = ac ? `${ac.name}` : '---';
    const cacStr = cac ? `${cac.name}` : '---';
    const dacStr = dac ? `${dac.name}` : '---';

    console.log(`│ ${code.padEnd(7)} │ ${acStr.padEnd(16)} │ ${cacStr.padEnd(19)} │ ${dacStr.padEnd(20)} │`);
  }

  console.log('└─────────┴──────────────────┴─────────────────────┴──────────────────────┘');

  // 7. 检查AllocationSourceConfig中配置的代码
  console.log('\n\n7️⃣ AllocationSourceConfig中配置的出勤代码:');

  const sourceConfigs = await prisma.allocationSourceConfig.findMany();

  for (const config of sourceConfigs) {
    console.log(`\n配置ID: ${config.configId}`);
    console.log(`  sourceType: ${config.sourceType}`);
    console.log(`  attendanceCodes (原始): ${config.attendanceCodes}`);

    try {
      const attendanceCodes = JSON.parse(config.attendanceCodes || '[]');
      console.log(`  attendanceCodes (解析):`, attendanceCodes);

      // 检查这些代码在哪些表中存在
      for (const code of attendanceCodes) {
        if (typeof code === 'string') {
          const inOldTable = await prisma.attendanceCode.findFirst({
            where: { code },
          });
          const inNewTable = await prisma.calculationAttendanceCode.findFirst({
            where: { code },
          });
          const inDefTable = await prisma.definitionAttendanceCode.findFirst({
            where: { code },
          });

          console.log(`\n    代码 "${code}":`);
          console.log(`      AttendanceCode表: ${inOldTable ? `✅ ID=${inOldTable.id}` : '❌ 不存在'}`);
          console.log(`      CalculationAttCode表: ${inNewTable ? `✅ ID=${inNewTable.id}` : '❌ 不存在'}`);
          console.log(`      DefinitionAttCode表: ${inDefTable ? `✅ ID=${inDefTable.id}` : '❌ 不存在'}`);
        }
      }
    } catch (e) {
      console.log(`  解析失败: ${e}`);
    }
  }

  await prisma.$disconnect();
}

checkAllCodeTables().catch(console.error);
