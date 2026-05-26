import { PrismaService } from './src/database/prisma.service';

async function test() {
  const prisma = new PrismaService();

  try {
    // Delete all existing CalcResult data
    console.log('删除所有CalcResult数据...');
    await prisma.calcResult.deleteMany({});
    console.log('✅ 已删除所有数据\n');

    // Query to check if any new data was generated
    console.log('等待2秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = await prisma.calcResult.findMany({
      where: {
        employeeNo: '202604003',
        workDate: '2026-05-09',
      },
      orderBy: {
        id: 'desc',
      },
      take: 5,
    });

    if (results.length === 0) {
      console.log('没有找到CalcResult数据（可能需要手动触发计算）');
    } else {
      console.log(`找到 ${results.length} 条CalcResult数据:\n`);

      for (const result of results) {
        console.log(`ID: ${result.id}`);
        console.log(`  员工编号: ${result.employeeNo}`);
        console.log(`  日期: ${result.workDate}`);
        console.log(`  账户ID: ${result.accountId || 'N/A'}`);
        console.log(`  账户名称: ${result.accountName || 'N/A'}`);
        console.log(`  账户路径: ${result.accountPath || 'N/A'}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
