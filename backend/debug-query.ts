import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 3; // Aaron.he
  const page = 1;
  const pageSize = 50;
  const status = undefined;
  const supportMode = undefined;

  console.log('=== 模拟前端请求 ===');
  console.log('userId:', userId);
  console.log('page:', page);
  console.log('pageSize:', pageSize);
  console.log('status:', status);
  console.log('supportMode:', supportMode);
  console.log('');

  // 完全模拟后端查询逻辑
  const where: any = {
    OR: [
      { applicantId: userId },
      { instance: { initiatorId: userId } },
    ],
  };
  if (status) where.status = status;
  if (supportMode) where.supportMode = supportMode;

  console.log('查询条件:', JSON.stringify(where, null, 2));

  const [total, items] = await Promise.all([
    prisma.supportRequest.count({ where }),
    prisma.supportRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        instance: {
          include: {
            approvals: {
              orderBy: { approvedAt: 'desc' },
            },
          },
        },
        result: true,
      },
    }),
  ]);

  console.log('');
  console.log('查询结果:');
  console.log('总数:', total);
  console.log('返回数量:', items.length);
  console.log('');

  // 显示前5条记录
  console.log('前5条记录:');
  items.slice(0, 5).forEach((item, index) => {
    const idx = index + 1;
    console.log(`${idx}. ID: ${item.id}, instanceNo: ${item.instanceNo}`);
    console.log(`   applicantId: ${item.applicantId}, initiatorId: ${item.instance.initiatorId}`);
    console.log(`   startDate: ${item.startDate?.toISOString().split('T')[0]}`);
    console.log(`   status: ${item.status}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
