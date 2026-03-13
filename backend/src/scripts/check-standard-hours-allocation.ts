import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function checkStandardHoursAllocation() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 检查标准工时分摊相关数据 ===\n');

  // 1. 检查产量记录
  console.log('1. 检查产量记录（ProductionRecord）:');
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      product: true,
    },
    take: 10,
    orderBy: {
      recordDate: 'desc',
    },
  });

  console.log(`   总产量记录数: ${productionRecords.length}（显示前10条）`);

  for (const record of productionRecords) {
    const standardHours = record.product ? record.product.standardHours : 0;
    const calculated = (record.actualQty || 0) * standardHours;
    console.log(`   - 日期: ${record.recordDate.toISOString().split('T')[0]}, ` +
                `产线ID: ${record.lineId}, 班次ID: ${record.shiftId}, ` +
                `产品: ${record.product?.name || 'N/A'}, ` +
                `实际产量: ${record.actualQty}, ` +
                `产品标准工时: ${standardHours}, ` +
                `计算标准工时: ${calculated}`);
  }

  // 2. 检查产品数据
  console.log('\n2. 检查产品数据（Product）:');
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
    },
    take: 10,
  });

  console.log(`   总产品数: ${products.length}（显示前10条）`);
  for (const product of products) {
    console.log(`   - 产品: ${product.name}, 标准工时: ${product.standardHours || 0}`);
  }

  // 3. 检查开线计划
  console.log('\n3. 检查开线计划（LineShift）:');
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
    },
    include: {
      line: true,
    },
    take: 10,
    orderBy: {
      scheduleDate: 'desc',
    },
  });

  console.log(`   总开线记录数: ${lineShifts.length}（显示前10条）`);
  for (const lineShift of lineShifts) {
    console.log(`   - 日期: ${lineShift.scheduleDate.toISOString().split('T')[0]}, ` +
                `产线: ${lineShift.line?.name || 'N/A'} (ID: ${lineShift.lineId}), ` +
                `班次: ${lineShift.shiftName}, ` +
                `参与分摊: ${lineShift.participateInAllocation}`);
  }

  // 4. 检查分摊配置
  console.log('\n4. 检查分摊配置（AllocationConfig）:');
  const allocationConfigs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
    take: 5,
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`   总配置数: ${allocationConfigs.length}（显示前5条）`);
  for (const config of allocationConfigs) {
    console.log(`   - 配置: ${config.configName}, 状态: ${config.status}, 规则数: ${config.rules.length}`);
    for (const rule of config.rules) {
      console.log(`     规则: ${rule.ruleName || 'N/A'}, 分摊依据: ${rule.allocationBasis}, 状态: ${rule.status}`);
    }
  }

  // 5. 检查分摊结果
  console.log('\n5. 检查分摊结果（AllocationResult）:');
  const allocationResults = await prisma.allocationResult.findMany({
    take: 10,
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`   总分摊结果数: ${allocationResults.length}（显示前10条）`);
  if (allocationResults.length === 0) {
    console.log('   ⚠️  没有找到任何分摊结果记录');
  } else {
    for (const result of allocationResults) {
      console.log(`   - 日期: ${result.recordDate.toISOString().split('T')[0]}, ` +
                  `源账户: ${result.sourceAccountName}, ` +
                  `目标: ${result.targetName}, ` +
                  `分摊依据: ${result.allocationBasis}, ` +
                  `分摊工时: ${result.allocatedHours}`);
    }
  }

  // 6. 检查工时记录
  console.log('\n6. 检查工时记录（CalcResult）:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      status: { in: ['PENDING', 'APPROVED'] },
    },
    include: {
      attendanceCode: true,
    },
    take: 10,
    orderBy: {
      calcDate: 'desc',
    },
  });

  console.log(`   总工时记录数: ${calcResults.length}（显示前10条）`);
  for (const result of calcResults) {
    console.log(`   - 日期: ${result.calcDate.toISOString().split('T')[0]}, ` +
                `员工: ${result.employeeNo}, ` +
                `出勤代码: ${result.attendanceCode?.name || 'N/A'}, ` +
                `实际工时: ${result.actualHours}, ` +
                `账户: ${result.accountName || 'N/A'}`);
  }

  console.log('\n=== 检查完成 ===');

  await app.close();
}

checkStandardHoursAllocation().catch(console.error);
