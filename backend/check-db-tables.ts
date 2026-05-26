import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 获取 Prisma 模型
  const models = Object.keys((prisma as any)._entities?.dic || {});
  
  console.log('=== Prisma 模型列表 ===');
  models.forEach(model => console.log(model));
}

main()
  .then(() => console.log('\n查询完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
