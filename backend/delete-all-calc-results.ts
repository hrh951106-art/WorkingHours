import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 删除所有计算结果 ===\n');

  // 删除所有 CalcResult
  const deleteResult = await prisma.calcResult.deleteMany({});
  
  console.log(`✅ 已删除 ${deleteResult.count} 条计算结果`);

  // 删除所有 WorkHourResult
  const deleteWorkHourResult = await prisma.workHourResult.deleteMany({});
  
  console.log(`✅ 已删除 ${deleteWorkHourResult.count} 条工时结果`);
}

main()
  .then(() => {
    console.log('\n✅ 删除完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
