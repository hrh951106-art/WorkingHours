import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllocationData() {
  console.log('========================================');
  console.log('检查分摊所需数据');
  console.log('========================================\n');

  // 1. 检查CalcResult表
  console.log('1. CalcResult表数据:');
  console.log('----------------------------------------');

  const allCalcResults = await prisma.calcResult.findMany({
    orderBy: {
      calcDate: 'desc',
    },
    take: 20,
  });

  console.log(`总记录数: ${allCalcResults.length}`);
  if (allCalcResults.length > 0) {
    console.log('\n最近的计算结果（前10条）:');
    for (let i = 0; i < Math.min(10, allCalcResults.length); i++) {
      const cr = allCalcResults[i];
      console.log(`  - ${cr.accountName}: ${cr.actualHours} 小时`);
      console.log(`    日期: ${cr.calcDate.toISOString().split('T')[0]}`);
      console.log(`    员工: ${cr.employeeNo || '未知'}`);
      console.log(`    科目ID: ${cr.accountId}`);
    }
  } else {
    console.log('⚠️  CalcResult表中没有任何数据');
  }

  // 检查所有账户科目
  console.log('\n所有账户科目:');
  const accounts = await prisma.laborAccount.findMany({
    where: {
      status: 'ACTIVE',
    },
  });
  console.log(`找到 ${accounts.length} 个账户科目`);

  const indirectAccounts = accounts.filter(acc =>
    acc.name.includes('间接') || acc.code.includes('INDIRECT')
  );

  console.log(`其中间接设备相关科目: ${indirectAccounts.length} 个`);
  if (indirectAccounts.length > 0) {
    console.log('\n间接设备科目列表:');
    for (const acc of indirectAccounts) {
      console.log(`  - ${acc.code}: ${acc.name}`);
    }
  }
  console.log();

  // 2. 检查ProductionRecord表
  console.log('2. ProductionRecord表数据:');
  console.log('----------------------------------------');

  const allProductionRecords = await prisma.productionRecord.findMany({
    orderBy: {
      recordDate: 'desc',
    },
    take: 20,
  });

  console.log(`总记录数: ${allProductionRecords.length}`);
  if (allProductionRecords.length > 0) {
    console.log('\n最近的产量记录（前10条）:');
    for (let i = 0; i < Math.min(10, allProductionRecords.length); i++) {
      const pr = allProductionRecords[i];
      const line = pr.lineId ? await prisma.productionLine.findUnique({
        where: { id: pr.lineId },
      }) : null;
      console.log(`  - ${line?.code || '未知'}: ${pr.actualQty || 0} 件`);
      console.log(`    日期: ${pr.recordDate.toISOString().split('T')[0]}`);
      console.log(`    产线ID: ${pr.lineId || '未设置'}`);
    }
  } else {
    console.log('⚠️  ProductionRecord表中没有任何数据');
  }
  console.log();

  // 3. 检查LineShift表
  console.log('3. LineShift表数据:');
  console.log('----------------------------------------');

  const allLineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      scheduleDate: 'desc',
    },
    take: 20,
  });

  console.log(`总记录数: ${allLineShifts.length}`);
  if (allLineShifts.length > 0) {
    // 按日期分组
    const shiftsByDate = new Map<string, number>();
    for (const ls of allLineShifts) {
      const dateKey = ls.scheduleDate.toISOString().split('T')[0];
      shiftsByDate.set(dateKey, (shiftsByDate.get(dateKey) || 0) + 1);
    }

    console.log('\n有开线记录的日期及数量:');
    for (const [date, count] of shiftsByDate.entries()) {
      console.log(`  - ${date}: ${count} 条开线记录`);
    }
  } else {
    console.log('⚠️  LineShift表中没有任何数据');
  }
  console.log();

  // 4. 检查日期数据完整性
  console.log('4. 数据完整性检查:');
  console.log('----------------------------------------');

  // 找出有开线记录的日期
  const datesWithShifts = new Set<string>();
  for (const ls of allLineShifts) {
    const dateKey = ls.scheduleDate.toISOString().split('T')[0];
    datesWithShifts.add(dateKey);
  }

  if (datesWithShifts.size > 0) {
    console.log(`\n有开线记录的日期: ${datesWithShifts.size} 天`);
    console.log('日期列表:');
    for (const date of Array.from(datesWithShifts).sort()) {
      // 检查该日期的CalcResult
      const calcResults = await prisma.calcResult.findMany({
        where: {
          calcDate: new Date(date),
        },
      });

      // 检查该日期的ProductionRecord
      const productionRecords = await prisma.productionRecord.findMany({
        where: {
          recordDate: new Date(date),
        },
      });

      const lineShifts = await prisma.lineShift.findMany({
        where: {
          scheduleDate: new Date(date),
          deletedAt: null,
        },
      });

      console.log(`\n  ${date}:`);
      console.log(`    开线记录: ${lineShifts.length} 条`);
      console.log(`    计算结果: ${calcResults.length} 条`);
      console.log(`    产量记录: ${productionRecords.length} 条`);

      // 检查是否有间接工时
      const indirectResults = calcResults.filter(cr =>
        cr.accountName?.includes('间接设备') && cr.actualHours > 0
      );
      console.log(`    间接工时: ${indirectResults.length} 条`);

      // 数据完整性判断
      const hasCalcResults = calcResults.length > 0;
      const hasIndirect = indirectResults.length > 0;
      const hasProduction = productionRecords.length > 0;
      const hasLineShifts = lineShifts.length > 0;

      if (hasCalcResults && hasIndirect && hasProduction && hasLineShifts) {
        console.log(`    ✓ 该日期数据完整，可以执行分摊`);
      } else {
        console.log(`    ✗ 该日期数据不完整:`);
        if (!hasCalcResults) console.log(`      - 缺少计算结果数据`);
        if (!hasIndirect) console.log(`      - 缺少间接工时数据`);
        if (!hasProduction) console.log(`      - 缺少产量数据`);
        if (!hasLineShifts) console.log(`      - 缺少开线记录`);
      }
    }
  }

  console.log('\n========================================');
  console.log('问题总结');
  console.log('========================================\n');

  console.log('G02配置需要以下数据才能执行分摊:');
  console.log('1. 间接工时数据（CalcResult表，accountName包含"间接设备"）');
  console.log('2. 开线记录（LineShift表，participateInAllocation=true）');
  console.log('3. 产量数据（ProductionRecord表）\n');

  console.log('当前状态:');
  console.log(`- CalcResult: ${allCalcResults.length > 0 ? '✓ 有数据' : '✗ 无数据'}`);
  console.log(`- 间接工时: ${allCalcResults.filter(cr => cr.accountName?.includes('间接设备')).length > 0 ? '✓ 有数据' : '✗ 无数据'}`);
  console.log(`- ProductionRecord: ${allProductionRecords.length > 0 ? '✓ 有数据' : '✗ 无数据'}`);
  console.log(`- LineShift: ${allLineShifts.length > 0 ? '✓ 有数据' : '✗ 无数据'}`);

  console.log('\n========================================');
}

checkAllocationData()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
