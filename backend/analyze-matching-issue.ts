import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 分析生产记录与工时结果匹配问题 ==========\n');

  // 1. 查看生产记录的详细信息
  console.log('【1. 生产记录详情】\n');
  const prodRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  console.log(`组织ID: ${prodRecord?.orgId}`);
  console.log(`组织名称: ${prodRecord?.orgName}`);
  console.log(`组织路径暗示: 工厂/车间/班组/电焊（4层结构）\n`);

  // 2. 查看工时结果的详细信息
  console.log('【2. 工时结果详情】\n');
  const workHours = await prisma.workHourResult.findMany({
    where: {
      calcDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    },
    distinct: ['accountPath']
  });

  console.log(`工时结果账户路径: ${workHours[0]?.accountPath}`);
  console.log(`账户路径暗示: 工厂/车间/班组/产品（4层结构）\n`);

  // 3. 关键：查看orgId=113对应的是什么账户
  console.log('【3. 查找orgId=113对应的账户】\n');

  // 方法1：查找LaborAccount表中是否有某个账户的ID=113
  const accountById = await prisma.laborAccount.findUnique({
    where: { id: 113 }
  });

  if (accountById) {
    console.log(`找到ID=113的账户:`);
    console.log(`  代码: ${accountById.code}`);
    console.log(`  名称: ${accountById.name}`);
    console.log(`  类型: ${accountById.type}`);
    console.log(`  路径: ${accountById.path || accountById.namePath}`);
  } else {
    console.log(`❌ LaborAccount表中没有ID=113的账户`);
  }

  // 方法2：查看组织ID=113对应的LaborAccount
  const accountByOrgId = await prisma.laborAccount.findFirst({
    where: { orgId: 113 }
  });

  if (accountByOrgId) {
    console.log(`\n找到orgId=113的账户:`);
    console.log(`  代码: ${accountByOrgId.code}`);
    console.log(`  名称: ${accountByOrgId.name}`);
    console.log(`  类型: ${accountByOrgId.type}`);
    console.log(`  路径: ${accountByOrgId.path || accountByOrgId.namePath}`);
  } else {
    console.log(`\n❌ LaborAccount表中没有orgId=113的账户`);
  }

  // 4. 查看工时结果中accountId指向的账户
  console.log('\n【4. 查看工时结果accountId指向的账户】\n');
  const sampleWorkHour = await prisma.workHourResult.findFirst({
    where: {
      calcDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    }
  });

  let account: any = null;
  if (sampleWorkHour?.accountId) {
    account = await prisma.laborAccount.findUnique({
      where: { id: sampleWorkHour.accountId }
    });

    if (account) {
      console.log(`工时结果accountId=${sampleWorkHour.accountId} 对应的账户:`);
      console.log(`  代码: ${account.code}`);
      console.log(`  名称: ${account.name}`);
      console.log(`  类型: ${account.type}`);
      console.log(`  路径: ${account.path || account.namePath}`);
    }
  }

  // 5. 核心问题分析
  console.log('\n【5. 核心问题】\n');

  console.log('分摊计算的匹配逻辑:');
  console.log('1. 生产记录的 orgId = 113，作为 sourceAccountId');
  console.log('2. 查询工时结果时，需要找到 accountId = 113 的账户');
  console.log('3. 但实际上工时结果的 accountId 指向其他账户');
  console.log('4. 导致无法匹配\n');

  console.log('具体分析:');
  console.log(`- 生产记录期望匹配: orgId=113 的账户`);
  console.log(`- 工时结果实际使用: accountId=${sampleWorkHour?.accountId} 的账户`);
  console.log(`- 如果 ${accountById?.name || 'orgId=113的账户'} ≠ ${account?.name || '工时结果的账户'}`);
  console.log(`- 则无法匹配，无法分摊`);

  // 6. 查看工时结果的accountId具体是多少
  console.log('\n【6. 详细对比】\n');
  console.log(`生产记录期望的账户ID: ${prodRecord?.orgId}`);
  console.log(`工时结果实际的账户ID: ${sampleWorkHour?.accountId}`);
  console.log(`是否相等: ${prodRecord?.orgId === sampleWorkHour?.accountId ? '✅ 相等' : '❌ 不相等'}`);

  // 7. 查看orgId=113是什么
  console.log('\n【7. orgId=113是什么组织？】\n');
  const org113 = await prisma.organization.findUnique({
    where: { id: 113 }
  });

  if (org113) {
    console.log(`组织ID=113的信息:`);
    console.log(`  代码: ${org113.code}`);
    console.log(`  名称: ${org113.name}`);
    console.log(`  类型: ${org113.type}`);
    console.log(`  父组织ID: ${org113.parentId}`);

    // 如果有父组织，查看父组织
    if (org113.parentId) {
      const parent = await prisma.organization.findUnique({
        where: { id: org113.parentId }
      });
      console.log(`  父组织: ${parent?.name} (${parent?.code})`);
    }

    console.log(`\n组织层级结构:`);
    console.log(`  第1层: ${org113.name} (${org113.code})`);
    console.log(`  看起来这是一个"电焊"层级`);
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
