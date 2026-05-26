import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查询定义出勤代码配置 ===\n');

  // 1. 查询所有定义出勤代码
  const definitionCodes = await prisma.definitionAttendanceCode.findMany({
    where: {
      status: 'ACTIVE'
    },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      type: true,
      calcAttendanceCode: true,
      calculationAttendanceCode: true,
      definitionAttendanceCode: true,
      calculateHours: true,
      showInAttendanceCard: true
    },
    orderBy: { code: 'asc' }
  });

  console.log(`找到 ${definitionCodes.length} 个激活的定义出勤代码:\n`);

  definitionCodes.forEach(dac => {
    console.log(`代码: ${dac.code}`);
    console.log(`名称: ${dac.name}`);
    console.log(`类别: ${dac.category || 'N/A'}`);
    console.log(`类型: ${dac.type || 'N/A'}`);
    console.log(`计算出勤代码: ${dac.calcAttendanceCode || 'N/A'}`);
    console.log(`是否计算工时: ${dac.calculateHours}`);
    console.log('---');
  });

  // 2. 查询计算结果中的计算出勤代码
  console.log('\n=== 查询计算结果中的计算出勤代码 ===\n');

  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202605002',
      calcDate: {
        gte: new Date('2026-05-10T00:00:00Z'),
        lte: new Date('2026-05-10T23:59:59Z')
      }
    },
    include: {
      calculationAttendanceCode: true
    },
    distinct: ['calculationAttendanceCodeId']
  });

  console.log(`计算结果中使用的计算出勤代码:\n`);

  calcResults.forEach(result => {
    if (result.calculationAttendanceCode) {
      console.log(`代码: ${result.calculationAttendanceCode.code}`);
      console.log(`名称: ${result.calculationAttendanceCode.name}`);
      console.log(`类型: ${result.calculationAttendanceCode.type}`);
      console.log(`是否计算工时: ${result.calculationAttendanceCode.calculateHours}`);
      console.log('---');
    }
  });

  // 3. 检查映射关系
  console.log('\n=== 检查映射关系 ===\n');

  const mappingCodes = await prisma.definitionAttendanceCode.findMany({
    where: {
      calcAttendanceCode: { not: null },
      status: 'ACTIVE'
    },
    select: {
      id: true,
      code: true,
      name: true,
      calcAttendanceCode: true
    }
  });

  console.log(`已配置映射关系的定义出勤代码 (${mappingCodes.length}个):\n`);

  mappingCodes.forEach(mc => {
    console.log(`${mc.code} (${mc.name}) <- ${mc.calcAttendanceCode}`);
  });

  if (mappingCodes.length === 0) {
    console.log('⚠️ 没有配置任何映射关系！这就是为什么工时结果为空的原因。');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
