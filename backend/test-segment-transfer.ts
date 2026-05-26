import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSegmentTransfer() {
  console.log('=== 测试班段转移账户合并逻辑 ===\n');

  // 1. 查询排班信息
  const schedule = await prisma.schedule.findFirst({
    where: {
      employeeId: (await prisma.employee.findUnique({ where: { employeeNo: '202604003' } }))!.id,
      scheduleDate: new Date('2026-05-12T00:00:00.000Z'),
    },
  });

  if (!schedule) {
    console.log('❌ 未找到排班信息');
    return;
  }

  console.log('✅ 找到排班信息:');
  console.log(`  排班ID: ${schedule.id}`);
  console.log(`  日期: ${schedule.scheduleDate.toISOString()}`);
  console.log(`  班段转移配置: ${schedule.adjustedSegments || '未配置'}`);

  // 2. 解析班段转移配置
  if (schedule.adjustedSegments) {
    try {
      const adjustedSegments = JSON.parse(schedule.adjustedSegments);
      console.log(`\n✅ 解析到 ${adjustedSegments.length} 个班段转移配置:`);
      adjustedSegments.forEach((seg: any) => {
        console.log(`  班段ID: ${seg.id}, 转移账户ID: ${seg.accountId}`);
      });

      // 3. 查询转移账户详情
      console.log('\n📊 转移账户详情:');
      for (const seg of adjustedSegments) {
        const account = await prisma.laborAccount.findUnique({
          where: { id: seg.accountId },
          select: { id: true, namePath: true, path: true },
        });

        if (account) {
          console.log(`  账户 ${seg.accountId}: ${account.namePath}`);
          console.log(`    路径: ${account.path}`);
        }
      }

      // 4. 查询对应的班次班段信息
      console.log('\n📋 对应的班次班段:');
      const shiftSegments = await prisma.shiftSegment.findMany({
        where: { id: { in: adjustedSegments.map((s: any) => s.id) } },
      });

      for (const seg of shiftSegments) {
        console.log(`  班段 ${seg.id}: ${seg.type} ${seg.startTime}-${seg.endTime}`);
      }

    } catch (error) {
      console.error('❌ 解析班段转移配置失败:', error);
    }
  }

  // 5. 查询摆卡记录
  console.log('\n🔍 当天的摆卡记录:');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202604003',
      pairDate: new Date('2026-05-12T00:00:00.000Z'),
    },
    include: {
      employee: true,
    },
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录`);
  punchPairs.forEach((pp, index) => {
    console.log(`  ${index + 1}. 摆卡ID: ${pp.id}, 上班: ${pp.inPunchTime}, 下班: ${pp.outPunchTime}, 刷卡账户: ${pp.accountId || '无'}`);
  });

  // 6. 检查是否有计算结果
  console.log('\n📊 当天的计算结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202604003',
      calcDate: new Date('2026-05-12T00:00:00.000Z'),
    },
    orderBy: { id: 'desc' },
    take: 10,
  });

  console.log(`找到 ${calcResults.length} 条计算结果`);
  calcResults.forEach((result, index) => {
    console.log(`  ${index + 1}. 账户: ${result.accountName || 'N/A'}`);
    console.log(`     账户路径: ${result.accountPath || 'N/A'}`);
    console.log(`     工时: ${result.actualHours}h, 金额: ¥${result.amount || 0}`);
  });

  console.log('\n=== 测试完成 ===');
}

testSegmentTransfer()
  .then(() => {
    console.log('✅ 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
