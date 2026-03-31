import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function checkAllocationDetails() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 检查分摊详细数据 ===\n');

  // 1. 检查车间标准工时分摊规则的详细信息
  console.log('1. 检查车间标准工时分摊规则:');
  const config = await prisma.allocationConfig.findFirst({
    where: {
      configName: '车间标准工时分摊规则',
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
      sourceConfig: true,
    },
  });

  if (config) {
    console.log(`   配置名称: ${config.configName}`);
    console.log(`   状态: ${config.status}`);
    console.log(`   生效时间: ${config.effectiveStartTime} ~ ${config.effectiveEndTime || '无限制'}`);
    console.log(`   规则数: ${config.rules.length}`);

    for (const rule of config.rules) {
      console.log(`\n   规则详情:`);
      console.log(`   - 规则名称: ${rule.ruleName || 'N/A'}`);
      console.log(`   - 规则类型: ${rule.ruleType}`);
      console.log(`   - 分摊依据: ${rule.allocationBasis}`);
      console.log(`   - 分摊范围ID: ${rule.allocationScopeId || '未配置（默认车间）'}`);
      console.log(`   - 分摊层级: ${rule.allocationHierarchyLevels}`);
      console.log(`   - 分摊出勤代码: ${rule.allocationAttendanceCodes}`);
      console.log(`   - 依据筛选: ${rule.basisFilter}`);
    }

    if (config.sourceConfig) {
      console.log(`\n   分摊源配置:`);
      console.log(`   - 源类型: ${config.sourceConfig.sourceType}`);
      console.log(`   - 员工筛选: ${config.sourceConfig.employeeFilter}`);
      console.log(`   - 账户筛选: ${config.sourceConfig.accountFilter}`);
      console.log(`   - 出勤代码: ${config.sourceConfig.attendanceCodes}`);
    }
  } else {
    console.log('   ⚠️  未找到"车间标准工时分摊规则"配置');
  }

  // 2. 检查最近的产量记录（详细）
  console.log('\n2. 检查最近的产量记录（详细）:');
  const recentProductionRecords = await prisma.productionRecord.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      product: true,
    },
    orderBy: {
      recordDate: 'desc',
    },
    take: 5,
  });

  for (const record of recentProductionRecords) {
    console.log(`\n   产量记录ID: ${record.id}`);
    console.log(`   - 日期: ${record.recordDate.toISOString().split('T')[0]}`);
    console.log(`   - 产线ID: ${record.lineId || '⚠️  NULL'}`);
    console.log(`   - 班次ID: ${record.shiftId}`);
    console.log(`   - 产品: ${record.product?.name || 'N/A'}`);
    console.log(`   - 实际产量: ${record.actualQty}`);
    console.log(`   - 产品标准工时: ${record.product?.standardHours || 0}`);
    console.log(`   - 计算标准工时: ${(record.actualQty || 0) * (record.product?.standardHours || 0)}`);
  }

  // 3. 检查最近的开线计划（详细）
  console.log('\n3. 检查最近的开线计划（详细）:');
  const recentLineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      participateInAllocation: true,
    },
    orderBy: {
      scheduleDate: 'desc',
    },
    take: 5,
  });

  for (const lineShift of recentLineShifts) {
    console.log(`\n   开线记录ID: ${lineShift.id}`);
    console.log(`   - 日期: ${lineShift.scheduleDate.toISOString().split('T')[0]}`);
    console.log(`   - 组织: ${lineShift.orgName || '⚠️  组织为空'} (ID: ${lineShift.orgId})`);
    console.log(`   - 班次: ${lineShift.shiftName} (ID: ${lineShift.shiftId})`);
    console.log(`   - 参与分摊: ${lineShift.participateInAllocation}`);
  }

  // 4. 检查最近的待分摊工时记录
  console.log('\n4. 检查最近的待分摊工时记录:');
  const pendingCalcResults = await prisma.calcResult.findMany({
    where: {
      status: { in: ['PENDING', 'APPROVED'] },
    },
    include: {
      attendanceCode: true,
      employee: true,
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 5,
  });

  console.log(`   找到 ${pendingCalcResults.length} 条待分摊工时记录`);
  for (const result of pendingCalcResults) {
    console.log(`\n   工时记录ID: ${result.id}`);
    console.log(`   - 日期: ${result.calcDate.toISOString().split('T')[0]}`);
    console.log(`   - 员工: ${result.employee?.name || 'N/A'} (${result.employeeNo})`);
    console.log(`   - 出勤代码: ${result.attendanceCode?.name || 'N/A'}`);
    console.log(`   - 实际工时: ${result.actualHours}`);
    console.log(`   - 账户: ${result.accountName || 'N/A'} (ID: ${result.accountId})`);
  }

  // 5. 检查产线信息
  console.log('\n5. 检查产线信息:');
  const productionLines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log(`   总产线数: ${productionLines.length}`);
  for (const line of productionLines) {
    console.log(`   - ID: ${line.id}, 名称: ${line.name}, 车间: ${line.workshopName} (ID: ${line.workshopId}), 类型: ${line.type}`);
  }

  console.log('\n=== 检查完成 ===');

  await app.close();
}

checkAllocationDetails().catch(console.error);
