import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeA06AllocationLogic() {
  console.log('=== A06规则分摊逻辑分析 ===\n');

  // 1. 获取A06规则配置
  const a06Config = await prisma.allocationConfig.findFirst({
    where: { configCode: 'A06', deletedAt: null },
    include: {
      rules: {
        include: { targets: true }
      },
      sourceConfig: true
    }
  });

  if (!a06Config) {
    console.log('❌ A06配置不存在');
    return;
  }

  const rule = a06Config.rules[0];
  console.log('1. 规则配置:');
  console.log(`   规则ID: ${rule.id}`);
  console.log(`   分配范围ID: ${rule.allocationScopeId}`);
  console.log(`   分摊依据: ${rule.allocationBasis}`);
  console.log(`   分配目标数量: ${rule.targets.length}`);

  // 2. 获取分摊范围配置（Organization）
  const scopeOrg = await prisma.organization.findUnique({
    where: { id: rule.allocationScopeId }
  });

  console.log('\n2. 分摊范围配置（Organization）:');
  console.log(`   组织ID: ${scopeOrg.id}`);
  console.log(`   代码: ${scopeOrg.code}`);
  console.log(`   名称: ${scopeOrg.name}`);
  console.log(`   类型: ${scopeOrg.type}`); // 03表示车间

  // 3. 获取待分摊数据（WorkHourResult）
  const sourceAttendanceCodes = JSON.parse(a06Config.sourceConfig.attendanceCodes || '[]');
  const defCodes = await prisma.definitionAttendanceCode.findMany({
    where: { code: { in: sourceAttendanceCodes } }
  });

  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeId: { in: defCodes.map(dc => dc.id) }
    },
    include: { employee: true },
    orderBy: { calcDate: 'desc' },
    take: 5
  });

  console.log('\n3. 待分摊数据示例:');
  if (workHourResults.length > 0) {
    const result = workHourResults[0];
    console.log(`   WorkHourResult ID: ${result.id}`);
    console.log(`   员工: ${result.employeeNo} - ${result.employee.name}`);
    console.log(`   日期: ${result.calcDate.toISOString().split('T')[0]}`);
    console.log(`   工时: ${result.workHours}`);
    console.log(`   账户ID: ${result.accountId}`);
    console.log(`   账户路径: ${result.accountPath}`);
    console.log(`   考勤代码ID: ${result.definitionAttendanceCodeId}`);
    console.log(`   考勤代码: ${result.definitionAttendanceCodeStr}`);
    console.log(`   班次ID: ${result.shiftId}`);
  }

  // 4. 按照用户期望的逻辑分析
  console.log('\n4. 按照用户期望的分摊逻辑分析:');

  if (workHourResults.length > 0) {
    const result = workHourResults[0];

    // 步骤1: 从accountPath中提取分摊范围层级的值
    console.log('\n   步骤1: 提取分摊范围值');
    console.log(`   待分摊数据 accountPath: ${result.accountPath}`);
    console.log(`   分摊范围: 车间（层级ID=5, 名称=W1总装车间, 代码=DH01）`);

    // 解析accountPath，假设格式为：大华富阳工厂/DH01/W1总装车间L1产线/...
    const pathParts = result.accountPath.split('/');
    console.log(`   accountPath分段: [${pathParts.join(', ')}]`);

    // 根据分摊范围类型确定层级索引
    // 类型03是车间层级，假设在accountPath中是第2段（索引1）
    const scopeLevelIndex = 1; // 车间层级
    const scopeValue = pathParts[scopeLevelIndex];
    console.log(`   提取的${scopeLevelIndex + 1}级值（车间）: ${scopeValue}`);

    // 步骤2: 到开线计划表匹配数据
    console.log('\n   步骤2: 匹配开线计划表');
    console.log(`   匹配条件: 日期=${result.calcDate.toISOString().split('T')[0]}, 班次ID=${result.shiftId}, 车间=${scopeValue}`);

    const lineShifts = await prisma.lineShift.findMany({
      where: {
        scheduleDate: result.calcDate,
        shiftId: result.shiftId
      }
    });

    console.log(`   找到 ${lineShifts.length} 条开线计划记录`);

    if (lineShifts.length > 0) {
      console.log('\n   步骤3: 从开线记录中提取相同层级值并筛选');

      const matchedTargets: any[] = [];

      for (const lineShift of lineShifts) {
        console.log(`\n   开线记录 ID=${lineShift.id}:`);
        console.log(`     组织ID: ${lineShift.orgId}`);
        console.log(`     账户ID: ${lineShift.accountId}`);

        // 获取组织的路径信息
        const org = await prisma.organization.findUnique({
          where: { id: lineShift.orgId }
        });

        // 获取劳动力账户路径
        let accountPath = null;
        if (lineShift.accountId) {
          const account = await prisma.laborAccount.findUnique({
            where: { id: lineShift.accountId },
            select: { path: true, namePath: true }
          });
          accountPath = account ? account.path : null;
        }

        console.log(`     组织路径: ${org ? org.name : 'N/A'}`);
        console.log(`     账户路径: ${accountPath || 'N/A'}`);

        if (accountPath) {
          const accountParts = accountPath.split('/');
          const accountScopeValue = accountParts[scopeLevelIndex];
          console.log(`     账户路径第${scopeLevelIndex + 1}级值（车间）: ${accountScopeValue}`);

          // 筛选匹配的记录
          if (accountScopeValue === scopeValue) {
            console.log(`     ✅ 匹配！将作为分摊目标`);
            matchedTargets.push({
              lineShiftId: lineShift.id,
              orgId: lineShift.orgId,
              accountId: lineShift.accountId,
              scopeValue: accountScopeValue
            });
          } else {
            console.log(`     ❌ 不匹配（期望: ${scopeValue}）`);
          }
        } else {
          console.log(`     ⚠️  账户ID为空，无法提取路径`);
        }
      }

      console.log('\n   步骤4: 确定分摊目标');
      console.log(`   共匹配到 ${matchedTargets.length} 个分摊目标:`);
      matchedTargets.forEach((target, index) => {
        console.log(`   目标${index + 1}: 组织ID=${target.orgId}`);
      });

      // 5. 当前代码逻辑分析
      console.log('\n5. 当前代码逻辑分析:');
      console.log('   ❌ 问题1: 当前代码期望手动配置AllocationRuleTarget');
      console.log(`      但A06规则的AllocationRuleTarget为空（${rule.targets.length}条）`);
      console.log('   ❌ 问题2: 当前代码使用源账户路径筛选产线');
      console.log('      但用户期望使用分摊范围（车间）来匹配开线计划');
      console.log('   ❌ 问题3: 当前代码使用产线的间接设备账户作为分摊目标');
      console.log('      但用户期望使用开线记录的组织ID作为分摊目标');

      // 6. 总结
      console.log('\n6. 总结:');
      console.log('   用户期望的分摊逻辑:');
      console.log('   1. 从待分摊数据的accountPath提取分摊范围层级的值');
      console.log('   2. 用日期+班次+分摊范围值匹配开线计划表');
      console.log('   3. 从匹配的开线记录的accountPath提取相同层级值并筛选');
      console.log('   4. 使用匹配的开线记录的组织ID作为分摊目标');
      console.log('\n   当前代码实现的分摊逻辑:');
      console.log('   1. 使用源账户路径筛选产线');
      console.log('   2. 使用产线的间接设备账户作为分摊目标');
      console.log('   3. 需要手动配置AllocationRuleTarget（未实现自动计算）');
    }
  }

  console.log('\n=== 分析完成 ===');
}

analyzeA06AllocationLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
