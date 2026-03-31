import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function checkG02Config() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 检查G02分摊配置 ===\n');

  // 1. 检查G02分摊配置
  console.log('1. 查找G02分摊配置:');
  const g02Config = await prisma.allocationConfig.findFirst({
    where: {
      configName: {
        contains: 'G02',
      },
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

  if (g02Config) {
    console.log(`   找到配置: ${g02Config.configName}`);
    console.log(`   状态: ${g02Config.status}`);
    console.log(`   生效时间: ${g02Config.effectiveStartTime} ~ ${g02Config.effectiveEndTime || '无限制'}`);
    console.log(`   规则数: ${g02Config.rules.length}`);

    for (const rule of g02Config.rules) {
      console.log(`\n   规则详情:`);
      console.log(`   - 规则名称: ${rule.ruleName || 'N/A'}`);
      console.log(`   - 规则类型: ${rule.ruleType}`);
      console.log(`   - 分摊依据: ${rule.allocationBasis}`);
      console.log(`   - 分摊范围ID: ${rule.allocationScopeId || '未配置'}`);
      console.log(`   - 分摊层级: ${rule.allocationHierarchyLevels}`);
      console.log(`   - 分摊出勤代码: ${rule.allocationAttendanceCodes}`);
      console.log(`   - 依据筛选: ${rule.basisFilter}`);
    }

    if (g02Config.sourceConfig) {
      console.log(`\n   分摊源配置:`);
      console.log(`   - 源类型: ${g02Config.sourceConfig.sourceType}`);
      console.log(`   - 员工筛选: ${g02Config.sourceConfig.employeeFilter}`);
      console.log(`   - 账户筛选: ${g02Config.sourceConfig.accountFilter}`);
      console.log(`   - 出勤代码: ${g02Config.sourceConfig.attendanceCodes}`);
    }
  } else {
    console.log('   ⚠️  未找到包含"G02"的分摊配置');
  }

  // 2. 检查I05出勤代码
  console.log('\n2. 检查I05出勤代码:');
  const i05Code = await prisma.attendanceCode.findFirst({
    where: {
      code: 'I05',
    },
  });

  if (i05Code) {
    console.log(`   找到I05出勤代码:`);
    console.log(`   - ID: ${i05Code.id}`);
    console.log(`   - 名称: ${i05Code.name}`);
    console.log(`   - 类型: ${i05Code.type}`);
  } else {
    console.log('   ⚠️  未找到I05出勤代码');
  }

  // 3. 检查张三的工时记录
  console.log('\n3. 检查张三的工时记录:');
  const zhangSan = await prisma.employee.findFirst({
    where: {
      name: '张三',
    },
  });

  if (zhangSan) {
    console.log(`   找到张三: ${zhangSan.name} (${zhangSan.employeeNo})`);

    const zhangSanResults = await prisma.calcResult.findMany({
      where: {
        employeeNo: zhangSan.employeeNo,
        attendanceCodeId: i05Code?.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      include: {
        attendanceCode: true,
      },
      orderBy: {
        calcDate: 'desc',
      },
      take: 10,
    });

    console.log(`   找到 ${zhangSanResults.length} 条I05工时记录`);
    for (const result of zhangSanResults) {
      console.log(`   - 日期: ${result.calcDate.toISOString().split('T')[0]}, ` +
                  `实际工时: ${result.actualHours}, ` +
                  `账户: ${result.accountName || 'N/A'} (ID: ${result.accountId})`);
    }
  } else {
    console.log('   ⚠️  未找到张三');
  }

  // 4. 检查工厂级别的账户层级配置
  console.log('\n4. 检查工厂级别的账户层级配置:');
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      level: 'asc',
    },
  });

  console.log(`   找到 ${hierarchyConfigs.length} 个层级配置:`);
  for (const config of hierarchyConfigs) {
    console.log(`   - 级别: ${config.level}, 名称: ${config.name}, ` +
                `映射类型: ${config.mappingType}, ` +
                `映射值: ${config.mappingValue || 'N/A'}`);
  }

  // 5. 检查最近的产量记录
  console.log('\n5. 检查最近的产量记录:');
  const recentProduction = await prisma.productionRecord.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      product: true,
      line: true,
    },
    orderBy: {
      recordDate: 'desc',
    },
    take: 10,
  });

  console.log(`   找到 ${recentProduction.length} 条产量记录`);
  for (const record of recentProduction) {
    console.log(`   - 日期: ${record.recordDate.toISOString().split('T')[0]}, ` +
                `产线: ${record.line?.name || 'N/A'} (ID: ${record.lineId}), ` +
                `产量: ${record.actualQty}`);
  }

  // 6. 检查工厂级别的开线计划
  console.log('\n6. 检查最近的开线计划:');
  const recentLineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      participateInAllocation: true,
    },
    orderBy: {
      scheduleDate: 'desc',
    },
    take: 10,
  });

  console.log(`   找到 ${recentLineShifts.length} 条开线计划`);
  for (const lineShift of recentLineShifts) {
    console.log(`   - 日期: ${lineShift.scheduleDate.toISOString().split('T')[0]}, ` +
                `组织ID: ${lineShift.orgId}, ` +
                `组织名称: ${lineShift.orgName || 'N/A'}`);
  }

  // 7. 检查富阳工厂的间接设备账户
  console.log('\n7. 检查富阳工厂的间接设备账户:');
  const factoryIndirectAccounts = await prisma.laborAccount.findMany({
    where: {
      AND: [
        {
          name: {
            contains: '富阳工厂',
          },
        },
        {
          name: {
            contains: '间接设备',
          },
        },
      ],
      status: 'ACTIVE',
    },
    take: 10,
  });

  console.log(`   找到 ${factoryIndirectAccounts.length} 个富阳工厂间接设备账户:`);
  for (const account of factoryIndirectAccounts) {
    console.log(`   - 账户名称: ${account.name}`);
    console.log(`     账户ID: ${account.id}`);
    console.log(`     层级值: ${account.hierarchyValues || 'N/A'}`);
  }

  console.log('\n=== 检查完成 ===');

  await app.close();
}

checkG02Config().catch(console.error);
