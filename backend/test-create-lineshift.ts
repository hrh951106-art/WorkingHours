import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 测试创建产线班次 ===\n');

  // 查询已存在的账户
  const accounts = await prisma.laborAccount.findMany({
    where: {
      type: 'SUB',
      usageType: 'SHIFT',
      namePath: {
        contains: 'W1总装',
      },
    },
    take: 5
  });

  console.log('可用的劳动力账户:\n');
  accounts.forEach(acc => {
    console.log(`ID=${acc.id}: ${acc.namePath}`);
  });

  if (accounts.length === 0) {
    console.log('❌ 没有可用的劳动力账户');
    return;
  }

  // 使用第一个账户创建测试数据
  const testAccount = accounts[0];
  console.log(`\n使用账户: ID=${testAccount.id}, 名称=${testAccount.namePath}\n`);

  // 模拟前端发送的创建请求
  const createData = {
    orgId: 6, // W1总装L1产线
    orgName: 'W1总装L1产线',
    accountId: testAccount.id,
    accountName: testAccount.namePath || testAccount.name,
    accountPath: testAccount.path || testAccount.code,
    shiftId: 8,
    shiftName: '生产长白班',
    scheduleDate: new Date('2026-05-11'),
    startTime: new Date('2026-05-11T00:00:00'),
    endTime: new Date('2026-05-11T12:00:00'),
    plannedProducts: [],
    participateInAllocation: true,
    description: '测试创建',
    status: 'ACTIVE',
  };

  try {
    const created = await prisma.lineShift.create({
      data: {
        orgId: createData.orgId,
        orgName: createData.orgName,
        accountId: createData.accountId,
        accountName: createData.accountName,
        shiftId: createData.shiftId,
        shiftName: createData.shiftName,
        scheduleDate: createData.scheduleDate,
        startTime: createData.startTime,
        endTime: createData.endTime,
        plannedProducts: JSON.stringify(createData.plannedProducts),
        participateInAllocation: createData.participateInAllocation,
        description: createData.description,
        status: createData.status,
      },
    });

    console.log('✅ 产线班次创建成功:\n');
    console.log(`ID: ${created.id}`);
    console.log(`组织: ${created.orgName}`);
    console.log(`账户ID: ${created.accountId}`);
    console.log(`账户名称: ${created.accountName}`);
    console.log(`班次: ${created.shiftName}`);
    console.log(`日期: ${created.scheduleDate.toISOString().split('T')[0]}`);

    // 验证数据
    const verified = await prisma.lineShift.findUnique({
      where: { id: created.id },
    });

    console.log('\n=== 验证结果 ===\n');
    console.log(`accountId: ${verified.accountId}`);
    console.log(`accountName: ${verified.accountName}`);

    // 清理测试数据
    await prisma.lineShift.delete({
      where: { id: created.id },
    });
    console.log('\n✅ 测试数据已清理');

  } catch (error: any) {
    console.error('\n❌ 创建失败:', error.message);
    if (error.code === 'P2002') {
      console.log('提示: 该产线在该日期的该班次已存在');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
