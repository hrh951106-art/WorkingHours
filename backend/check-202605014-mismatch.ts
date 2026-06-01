import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查202605014的任职记录和账户不匹配问题
 */
async function checkMismatch() {
  const employeeNo = '202605014';

  console.log('=== 检查202605014任职记录与账户不匹配问题 ===\n');

  // 1. 查找员工
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo}), ID: ${employee.id}\n`);

  // 2. 查询所有任职记录
  const workInfoHistoryList = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    select: {
      id: true,
      effectiveDate: true,
      endDate: true,
      position: true,
      jobLevel: true,
      isCurrent: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`任职记录数: ${workInfoHistoryList.length}\n`);

  workInfoHistoryList.forEach((wh, index) => {
    console.log(`记录${wh.id} (${index === 0 && wh.isCurrent ? '当前' : '历史'}):`);
    console.log(`  生效日期: ${wh.effectiveDate.toISOString().substring(0, 10)}`);
    console.log(`  结束日期: ${wh.endDate ? wh.endDate.toISOString().substring(0, 10) : '至今'}`);
    console.log(`  职位: ${wh.position || 'NULL'}`);
    console.log(`  职级: ${wh.jobLevel || 'NULL'}`);
    console.log(`  是否当前: ${wh.isCurrent}`);
    console.log(`  创建时间: ${wh.createdAt.toISOString().substring(0, 19)}`);
    console.log(`  更新时间: ${wh.updatedAt.toISOString().substring(0, 19)}`);
    console.log('');
  });

  // 3. 查询主账户
  const accounts = await prisma.laborAccount.findMany({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      effectiveDate: true,
      path: true,
      namePath: true,
      hierarchyValues: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`主账户数: ${accounts.length}\n`);

  accounts.forEach((acc) => {
    console.log(`账户${acc.id}:`);
    console.log(`  状态: ${acc.status}`);
    console.log(`  生效日期: ${acc.effectiveDate?.toISOString().substring(0, 10) || 'NULL'}`);
    console.log(`  路径: ${acc.path}`);
    console.log(`  名称路径: ${acc.namePath}`);
    console.log(`  创建时间: ${acc.createdAt.toISOString().substring(0, 19)}`);
    console.log(`  更新时间: ${acc.updatedAt.toISOString().substring(0, 19)}`);

    if (acc.hierarchyValues) {
      try {
        const hv = JSON.parse(acc.hierarchyValues);
        console.log(`  层级值:`);
        hv.forEach((level: any) => {
          const hasValue = level.selectedValue ? '✅' : '❌';
          const code = level.selectedValue?.code || 'NULL';
          const name = level.selectedValue?.name || 'NULL';
          console.log(`    ${hasValue} Level ${level.level}: ${code} - ${name}`);
        });
      } catch (e) {
        console.log('  解析hierarchyValues失败');
      }
    }
    console.log('');
  });

  // 4. 对比分析
  console.log('=== 问题分析 ===\n');

  if (workInfoHistoryList.length === 1) {
    const wh = workInfoHistoryList[0];
    console.log('任职记录（唯一）:');
    console.log(`  职级: ${wh.jobLevel}`);
    console.log(`  更新时间: ${wh.updatedAt.toISOString().substring(0, 19)}`);
    console.log('');

    const latestAccount = accounts[0];
    if (latestAccount && latestAccount.hierarchyValues) {
      try {
        const hv = JSON.parse(latestAccount.hierarchyValues);
        const level7 = hv.find((level: any) => level.level === 7);

        console.log('主账户Level 7:');
        console.log(`  值: ${level7?.selectedValue?.code || 'NULL'}`);
        console.log(`  名称: ${level7?.selectedValue?.name || 'NULL'}`);
        console.log(`  账户更新时间: ${latestAccount.updatedAt.toISOString().substring(0, 19)}`);
        console.log('');

        if (wh.jobLevel && level7?.selectedValue?.code !== wh.jobLevel) {
          console.log('❌ 问题发现：');
          console.log(`  任职记录职级: ${wh.jobLevel}`);
          console.log(`  账户Level 7: ${level7.selectedValue.code}`);
          console.log(`  不匹配！`);
          console.log('');

          console.log('可能的原因：');
          console.log('1. 任职记录在职级更新后，账户没有同步更新');
          console.log('2. 账户生成时使用了错误的职级数据');
          console.log('3. 职级字段映射配置错误');

          // 检查更新时间顺序
          if (wh.updatedAt > latestAccount.updatedAt) {
            console.log('');
            console.log('✅ 确认：任职记录更新时间晚于账户更新时间');
            console.log(`  任职记录更新: ${wh.updatedAt.toISOString().substring(0, 19)}`);
            console.log(`  账户更新: ${latestAccount.updatedAt.toISOString().substring(0, 19)}`);
            console.log('  建议：重新生成账户以同步最新任职记录');
          }
        } else {
          console.log('✅ 职级匹配正确');
        }
      } catch (e) {
        console.log('解析层级值失败');
      }
    }
  }

  await prisma.$disconnect();
}

checkMismatch()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
