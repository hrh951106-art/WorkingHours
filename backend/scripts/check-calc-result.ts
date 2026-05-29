import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const recordDate = '2026-05-07';

  console.log('========================================');
  console.log(`检查员工 ${employeeNo} 在 ${recordDate} 的 CalcResult 表`);
  console.log('========================================\n');

  // 查询CalcResult表
  const calcDate = new Date(recordDate);
  calcDate.setHours(0, 0, 0, 0);

  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate,
    },
  });

  console.log(`找到 ${calcResults.length} 条 CalcResult 记录\n`);

  if (calcResults.length > 0) {
    calcResults.forEach((result) => {
      console.log(`=== CalcResult ID: ${result.id} ===`);
      console.log(`员工: ${result.employeeNo}`);
      console.log(`计算日期: ${result.calcDate.toISOString().substring(0, 10)}`);
      console.log(`账户工时: ${result.accountHours}`);

      // 解析accountHours查看挣得工时
      try {
        const accountHours = JSON.parse(result.accountHours || '[]');
        console.log('\n账户工时明细:');
        accountHours.forEach((ah: any, index: number) => {
          console.log(`  ${index + 1}. 类型: ${ah.type}, 账户: ${ah.accountName}, 工时: ${ah.hours}`);
        });
      } catch (e) {
        console.log('无法解析账户工时');
      }
      console.log('');
    });
  } else {
    console.log('CalcResult 表中���有该员工在该日期的记录');
    console.log('\n这可能是因为:');
    console.log('1. 还没有运行过工时计算');
    console.log('2. 该员工在该日期没有考勤数据');
    console.log('3. 计算结果已被删除');
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  });
