async function testFindAll() {
  // 直接查询数据库
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  // 模拟前端调用的查询参数
  const query = { status: 'ACTIVE', page: 1, pageSize: 10 };

  console.log('测试查询参数:', query);

  const skip = (query.page - 1) * query.pageSize;
  const where: any = {
    deletedAt: null,
  };
  if (query.status) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.attendanceRuleGroup.findMany({
      where,
      skip,
      take: +query.pageSize,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: {
        details: true,
      },
    }),
    prisma.attendanceRuleGroup.count({ where }),
  ]);

  // 解析details中的JSON数组
  const parsedItems = items.map((item: any) => ({
    ...item,
    details: item.details.map((detail: any) => ({
      ...detail,
      attendanceCodeIds: JSON.parse(detail.attendanceCodeIds || '[]'),
      amountPolicyIds: JSON.parse(detail.amountPolicyIds || '[]'),
    })),
  }));

  const result = {
    items: parsedItems,
    total,
    page: +query.page,
    pageSize: +query.pageSize,
    totalPages: Math.ceil(total / +query.pageSize),
  };

  console.log('返回结果:', JSON.stringify(result, null, 2));
  console.log('\nitems 数量:', result.items?.length);
  console.log('total:', result.total);

  if (result.items && result.items.length > 0) {
    console.log('\n第一个考勤规则组:');
    console.log(JSON.stringify(result.items[0], null, 2));
  }

  await prisma.$disconnect();
}

(async () => {
  try {
    await testFindAll();
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
