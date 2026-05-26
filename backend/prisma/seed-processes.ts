import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProcesses() {
  console.log('开始初始化工序数据...');

  // 检查是否已有工序数据
  const existingCount = await prisma.process.count({
    where: { deletedAt: null },
  });

  if (existingCount > 0) {
    console.log(`工序数据已存在，共 ${existingCount} 条，跳过初始化`);
    return;
  }

  // 创建常用工序
  const processes = [
    { code: 'CUTTING', name: '裁剪', sortOrder: 1, description: '面料裁剪工序' },
    { code: 'SEWING', name: '缝制', sortOrder: 2, description: '缝合缝制工序' },
    { code: 'IRONING', name: '熨烫', sortOrder: 3, description: '熨烫整理工序' },
    { code: 'PACKING', name: '包装', sortOrder: 4, description: '产品包装工序' },
    { code: 'QC', name: '质检', sortOrder: 5, description: '质量检验工序' },
    { code: 'ASSEMBLY', name: '组装', sortOrder: 6, description: '产品组装工序' },
    { code: 'WELDING', name: '焊接', sortOrder: 7, description: '焊接工序' },
    { code: 'PAINTING', name: '喷涂', sortOrder: 8, description: '表面喷涂工序' },
  ];

  for (const process of processes) {
    await prisma.process.create({
      data: {
        ...process,
        status: 'ACTIVE',
      },
    });
    console.log(`创建工序: ${process.name} (${process.code})`);
  }

  console.log('工序数据初始化完成！');
}

seedProcesses()
  .catch((e) => {
    console.error('初始化工序数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
