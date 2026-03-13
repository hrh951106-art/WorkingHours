import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function deleteAllocationResults() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 删除分摊结果数据 ===\n');

  // 统计删除前的总数
  const beforeCount = await prisma.allocationResult.count();
  console.log(`删除前分摊结果总数: ${beforeCount}`);

  if (beforeCount === 0) {
    console.log('没有需要删除的数据');
    await app.close();
    return;
  }

  // 执行删除
  console.log('\n开始删除...');
  const deleteResult = await prisma.allocationResult.deleteMany({});

  console.log(`✓ 已删除 ${deleteResult.count} 条分摊结果`);

  // 验证删除后的总数
  const afterCount = await prisma.allocationResult.count();
  console.log(`\n删除后分摊结果总数: ${afterCount}`);

  if (afterCount === 0) {
    console.log('\n✓ 所有分摊结果数据已成功删除！');
  } else {
    console.log(`\n⚠ 还有 ${afterCount} 条数据未被删除（可能受其他条件限制）`);
  }

  await app.close();
}

deleteAllocationResults().catch(console.error);
