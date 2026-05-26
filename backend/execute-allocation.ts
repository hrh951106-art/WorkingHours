import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const configId = 4;
  const recordDate = '2025-05-10'; // 使用工时数据的日期（1778716800000是2025年5月10日）
  
  console.log('=== 执行 A04 分摊计算 ===\n');
  console.log('配置ID:', configId);
  console.log('计算日期:', recordDate);
  
  // 调用分摊计算（直接调用服务）
  // 这里我们需要使用 HTTP API，让我先检查一下需要什么参数
  
  // 先查看有没有相关的计算记录
  console.log('\n=== 查看现有分摊结果 ===\n');
  const results = await prisma.allocationResult.findMany({
    where: { configId },
    take: 5,
  });
  
  console.log(`现有分摊结果数量: ${results.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
