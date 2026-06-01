import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查Product表中的所有产品 ==========\n');

  const products = await prisma.product.findMany({
    select: {
      id: true,
      code: true,
      name: true
    },
    orderBy: {
      id: 'asc'
    }
  });

  console.log(`找到 ${products.length} 个产品\n`);

  if (products.length === 0) {
    console.log('❌ Product表中没有任何产品');
    return;
  }

  console.log('产品列表:');
  for (const product of products) {
    console.log(`  ID=${product.id}: ${product.code} - ${product.name}`);
  }

  // 查找ID=15附近的产品
  console.log('\n【ID=15附近的产品】\n');
  const nearbyProducts = products.filter(p => p.id >= 13 && p.id <= 17);
  for (const product of nearbyProducts) {
    console.log(`  ID=${product.id}: ${product.code} - ${product.name}`);
  }

  // 查找名为"大桶"的产品
  console.log('\n【查找名为"大桶"的产品】\n');
  const datongProducts = products.filter(p => p.name.includes('大桶') || p.name === '大桶');
  if (datongProducts.length > 0) {
    console.log('找到匹配的产品:');
    for (const product of datongProducts) {
      console.log(`  ID=${product.id}: ${product.code} - ${product.name}`);
    }
  } else {
    console.log('❌ 没有找到名为"大桶"的产品');
  }

  // 查找代码为"A01"的产品
  console.log('\n【查找代码为"A01"的产品】\n');
  const a01Products = products.filter(p => p.code === 'A01');
  if (a01Products.length > 0) {
    console.log('找到匹配的产品:');
    for (const product of a01Products) {
      console.log(`  ID=${product.id}: ${product.code} - ${product.name}`);
    }
  } else {
    console.log('❌ 没有找到代码为"A01"的产品');
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
