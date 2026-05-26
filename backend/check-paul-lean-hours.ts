import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-10';

  console.log(`=== 查询员工 ${employeeNo} 在 ${date} 的精益工时问题 ===\n`);

  // 1. 查询员工信息
  const employee = await prisma.employee.findUnique({
    where: { employeeNo },
    select: { id: true, employeeNo: true, name: true }
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  console.log('员工信息:', employee);

  // 2. 查询精益工时配置
  console.log('\n=== 查询精益工时配置 ===\n');

  const leanHourConfigs = await prisma.leanHourEnhancementMethod.findMany({
    where: { isActive: true },
    include: {
      attendanceCodes: true
    }
  });

  console.log(`找到 ${leanHourConfigs.length} 个激活的精益工时配置:\n`);

  leanHourConfigs.forEach(config => {
    console.log(`配置: ${config.code} (${config.name})`);
    console.log(`类型: ${config.enhancementType}`);
    console.log(`出勤代码数量: ${config.attendanceCodes.length}`);
    if (config.attendanceCodes.length > 0) {
      console.log(`出勤代码: ${config.attendanceCodes.map(ac => ac.code).join(', ')}`);
    }
    console.log('');
  });

  // 3. 查询定义级出勤代码
  console.log('\n=== 查询定义级出勤代码 ===\n');

  const definitionAttendanceCodes = await prisma.definitionAttendanceCode.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      leanHourCode: true,
      calculationType: true,
      workHourDefinitionCode: true
    }
  });

  console.log(`找到 ${definitionAttendanceCodes.length} 个定义级出勤代码:\n`);

  definitionAttendanceCodes.forEach(dac => {
    console.log(`代码: ${dac.code} (${dac.name})`);
    console.log(`精益工时代码: ${dac.leanHourCode || 'N/A'}`);
    console.log(`计算类型: ${dac.calculationType || 'N/A'}`);
    console.log(`工时定义代码: ${dac.workHourDefinitionCode || 'N/A'}`);
    console.log('');
  });

  // 4. 查询计算结果详情
  console.log('\n=== 查询计算结果详情 ===\n');

  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: employee.employeeNo,
      calcDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    },
    orderBy: { id: 'asc' }
  });

  console.log(`找到 ${calcResults.length} 条计算结果\n`);

  // 只显示前5条详细信息
  calcResults.slice(0, 5).forEach((result, index) => {
    console.log(`--- 计算结果 ${index + 1} ---`);
    console.log(`ID: ${result.id}`);
    console.log(`出勤代码ID: ${result.attendanceCodeId || 'N/A'}`);
    console.log(`计算出勤代码ID: ${result.calculationAttendanceCodeId || 'N/A'}`);
    console.log(`标准工时: ${result.standardHours} 小时`);
    console.log(`实际工时: ${result.actualHours} 小时`);
    console.log(`账户工时: ${result.accountHours}`);
    console.log(`状态: ${result.status}`);
    console.log('');
  });

  // 5. 查询工时定义
  console.log('\n=== 查询工时定义 ===\n');

  const workHourDefinitions = await prisma.workHourDefinition.findMany({
    select: {
      code: true,
      name: true,
      category: true
    }
  });

  console.log(`找到 ${workHourDefinitions.length} 个工时定义:\n`);

  workHourDefinitions.forEach(whd => {
    console.log(`代码: ${whd.code} (${whd.name})`);
    console.log(`类别: ${whd.category}`);
    console.log('');
  });

  // 6. 检查工时结果表是否存在该日期的记录
  console.log('\n=== 检查工时结果表 ===\n');

  const allWorkHourResults = await prisma.workHourResult.findMany({
    where: {
      employeeNo: employee.employeeNo
    },
    orderBy: { workDate: 'desc' },
    take: 10
  });

  console.log(`该员工最近10条工时结果记录:\n`);

  allWorkHourResults.forEach(result => {
    console.log(`日期: ${result.workDate.toISOString().split('T')[0]}`);
    console.log(`出勤代码: ${result.calcAttendanceCode || result.attendanceCode || 'N/A'}`);
    console.log(`工时: ${result.workHours} 小时`);
    console.log(`来源: ${result.source || 'N/A'}`);
    console.log('');
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
