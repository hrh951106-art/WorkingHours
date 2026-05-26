import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAttendanceCodes() {
  console.log('========== 测试出勤代码数据获取 ==========');

  // 测试1: 获取所有出勤代码定义
  console.log('\n1. 获取所有出勤代码定义:');
  const allCodes = await prisma.definitionAttendanceCode.findMany({
    orderBy: { code: 'asc' },
  });
  console.log(`总数: ${allCodes.length}`);
  console.log('数据:', JSON.stringify(allCodes, null, 2));

  // 测试2: 获取激活状态的出勤代码（模拟分摊配置页面）
  console.log('\n2. 获取激活状态的出勤代码（分摊配置使用）:');
  const activeCodes = await prisma.definitionAttendanceCode.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: [{ id: 'asc' }],
  });
  console.log(`总数: ${activeCodes.length}`);
  console.log('数据:', JSON.stringify(activeCodes, null, 2));

  // 测试3: 检查字段结构
  console.log('\n3. 检查第一条数据的字段结构:');
  if (activeCodes.length > 0) {
    const first = activeCodes[0];
    console.log('ID:', first.id);
    console.log('CODE:', first.code);
    console.log('NAME:', first.name);
    console.log('STATUS:', first.status);
    console.log('TYPE:', first.type);
    console.log('所有字段:', Object.keys(first));
  }

  await prisma.$disconnect();
}

testAttendanceCodes().catch(console.error);
