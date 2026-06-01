import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查账户路径匹配问题 ==========\n');

  // 1. 检查5月19日的详细工时结果
  console.log('【1. 5月19日工时结果详情】\n');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      calcDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    }
  });

  console.log(`找到 ${workHourResults.length} 条工时结果\n`);

  for (const whr of workHourResults) {
    console.log(`员工: ${whr.employeeNo} - ${whr.employeeName}`);
    console.log(`  账户ID: ${whr.accountId}`);
    console.log(`  账户名称: ${whr.accountName}`);
    console.log(`  账户路径: ${whr.accountPath || '(无)'}`);
    console.log(`  工时: ${whr.workHours}`);
    console.log(`  考勤代码: ${whr.attendanceCode} (${whr.attendanceCodeName})`);
    console.log('');
  }

  // 2. 检查5月19日的生产记录
  console.log('【2. 5月19日生产记录详情】\n');
  const productionRecord = await prisma.productionRecord.findFirst({
    where: {
      recordDate: new Date('2026-05-19')
    }
  });

  if (productionRecord) {
    console.log(`产品: ${productionRecord.productName} (${productionRecord.productCode})`);
    console.log(`数量: ${productionRecord.actualQty}`);
    console.log(`组织ID: ${productionRecord.orgId}`);
    console.log(`组织名称: ${productionRecord.orgName}`);
    console.log(`标准工时: ${productionRecord.standardHours}`);
    console.log(`总标准工时: ${productionRecord.totalStdHours}`);
    console.log(`工作工时: ${productionRecord.workHours || '(无)'}`);
    console.log('');
  }

  // 3. 检查电焊相关的账户
  console.log('【3. 电焊相关账户】\n');
  const weldingAccounts = await prisma.laborAccount.findMany({
    where: {
      namePath: {
        contains: '电焊'
      },
      type: 'MAIN'
    }
  });

  console.log(`找到 ${weldingAccounts.length} 个包含"电焊"的主账户\n`);

  for (const account of weldingAccounts) {
    console.log(`账户: ${account.code}`);
    console.log(`  名称: ${account.name}`);
    console.log(`  名称路径: ${account.namePath || account.path}`);
    console.log(`  员工ID: ${account.employeeId}`);
    console.log(`  状态: ${account.status}`);
    console.log('');
  }

  // 4. 检查是否有电焊相关的工时结果
  console.log('【4. 检查账户路径匹配】\n');

  // 检查所有工时结果的账户路径
  const allAccounts = new Set();
  for (const whr of workHourResults) {
    allAccounts.add(whr.accountPath);
  }

  console.log(`工时结果中的账户路径:`);
  for (const path of allAccounts) {
    console.log(`  - ${path}`);
    if (path.includes('电焊')) {
      console.log(`    ✅ 包含"电焊"`);
    } else {
      console.log(`    ❌ 不包含"电焊"`);
    }
  }

  // 5. 检查生产记录的组织路径
  console.log('\n【5. 组织路径匹配】\n');
  if (productionRecord) {
    console.log(`生产记录组织: ${productionRecord.orgName}`);
    console.log(`组织ID: ${productionRecord.orgId}`);

    // 查找这个组织
    const org = await prisma.organization.findUnique({
      where: { id: productionRecord.orgId }
    });

    if (org) {
      console.log(`\n组织详情:`);
      console.log(`  代码: ${org.code}`);
      console.log(`  名称: ${org.name}`);
      console.log(`  类型: ${org.type}`);
      console.log(`  路径: ${org.path || org.namePath || '(无)'}`);

      // 查找父组织
      if (org.parentId) {
        const parentOrg = await prisma.organization.findUnique({
          where: { id: org.parentId }
        });
        if (parentOrg) {
          console.log(`\n父组织:`);
          console.log(`  代码: ${parentOrg.code}`);
          console.log(`  名称: ${parentOrg.name}`);
          console.log(`  类型: ${parentOrg.type}`);
        }
      }
    }
  }

  // 6. 问题分析
  console.log('\n【6. 问题分析】\n');

  console.log('关键信息:');
  console.log(`1. 生产记录日期: 2026-05-19`);
  console.log(`2. 生产记录组织: ${productionRecord?.orgName}`);
  console.log(`3. 工时结果数量: ${workHourResults.length}`);
  console.log(`4. 工时结果涉及账户数: ${allAccounts.size}`);

  const hasWeldingPath = Array.from(allAccounts).some(path => path.includes('电焊'));
  console.log(`5. 工时结果账户包含"电焊": ${hasWeldingPath ? '✅ 是' : '❌ 否'}`);

  if (!hasWeldingPath) {
    console.log('\n❌ 可能问题: 工时结果的账户路径不包含"电焊"');
    console.log('   生产记录组织是: ' + productionRecord?.orgName);
    console.log('   但工时结果来自其他账户');
    console.log('   这可能导致分摊时找不到匹配的账户');
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
