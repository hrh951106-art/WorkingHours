import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRule7Detail() {
  console.log('=== 检查规则ID=7的详细配置 ===\n');

  const rule = await prisma.allocationRuleConfig.findUnique({
    where: { id: 7 },
    include: {
      config: true,
      targets: true
    }
  });

  if (!rule) {
    console.log('❌ 规则ID=7不存在');
    return;
  }

  console.log('1. 规则基本信息:');
  console.log(`   规则ID: ${rule.id}`);
  console.log(`   规则名称: ${rule.ruleName}`);
  console.log(`   配置ID: ${rule.configId}`);
  console.log(`   配置代码: ${rule.config?.configCode}`);
  console.log(`   配置名称: ${rule.config?.configName}`);

  console.log('\n2. 考勤代码过滤配置:');
  console.log(`   allocationAttendanceCodes字段原始值: "${rule.allocationAttendanceCodes}"`);
  console.log(`   字段类型: ${typeof rule.allocationAttendanceCodes}`);

  // 解析JSON
  try {
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes);
    console.log(`   解析后的值:`, attendanceCodes);
    console.log(`   数组长度: ${attendanceCodes.length}`);

    if (attendanceCodes.length > 0) {
      console.log('\n   配置的考勤代码ID:');
      for (let i = 0; i < attendanceCodes.length; i++) {
        const codeId = attendanceCodes[i];
        const code = await prisma.attendanceCode.findUnique({
          where: { id: codeId }
        });
        if (code) {
          console.log(`     [${i}] ID=${codeId} → ${code.code} - ${code.name}`);
        } else {
          console.log(`     [${i}] ID=${codeId} → ❌ 考勤代码不存在`);
        }
      }
    } else {
      console.log('   ❌ 数组为空，确实是未配置');
    }
  } catch (e) {
    console.log('   ❌ JSON解析失败:', e);
  }

  console.log('\n3. 分配范围配置:');
  console.log(`   allocationScopeId: ${rule.allocationScopeId}`);

  if (rule.allocationScopeId) {
    // 检查AllocationScope表是否存在
    try {
      const scope = await prisma.allocationScope.findUnique({
        where: { id: rule.allocationScopeId }
      });

      if (scope) {
        console.log('\n   范围详情:');
        console.log(`     范围ID: ${scope.id}`);
        console.log(`     范围名称: ${scope.scopeName}`);
        console.log(`     范围类型: ${scope.scopeType}`);
        console.log(`     范围值: ${scope.scopeValue}`);
        console.log(`     状态: ${scope.status}`);
      } else {
        console.log(`   ❌ 范围ID ${rule.allocationScopeId} 在AllocationScope表中不存在`);
      }
    } catch (e: any) {
      console.log(`   ⚠️  查询范围失败: ${e.message}`);
      console.log('   可能AllocationScope模型不存在');
    }

    // 尝试查看其他可能的范围表
    console.log('\n   检查是否使用了其他范围表...');
    const tables = await prisma.$queryRawUnsafe(`
      SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%scope%'
    `);
    console.log('   相关表:', tables);
  }

  console.log('\n4. 分配目标配置:');
  console.log(`   目标数量: ${rule.targets ? rule.targets.length : 0}`);

  if (rule.targets && rule.targets.length > 0) {
    rule.targets.forEach((target, index) => {
      console.log(`\n   目标 ${index + 1}:`);
      console.log(`     ID: ${target.id}`);
      console.log(`     目标类型: ${target.targetType}`);
      console.log(`     目标ID: ${target.targetId}`);
      console.log(`     账户ID: ${target.accountId}`);
      console.log(`     固定工时: ${target.fixedHours}`);
    });
  } else {
    console.log('   ❌ 没有分配目标');
  }

  console.log('\n5. 归属层级配置:');
  console.log(`   allocationHierarchyLevels字段值: "${rule.allocationHierarchyLevels}"`);

  try {
    const hierarchyLevels = JSON.parse(rule.allocationHierarchyLevels);
    console.log(`   解析后的值:`, hierarchyLevels);
    console.log(`   数组长度: ${hierarchyLevels.length}`);

    if (hierarchyLevels.length > 0) {
      console.log('\n   配置的层级:');
      hierarchyLevels.forEach((level: any, index: number) => {
        console.log(`     [${index}] ${JSON.stringify(level)}`);
      });
    }
  } catch (e) {
    console.log('   ❌ JSON解析失败');
  }

  console.log('\n6. 基础过滤器:');
  console.log(`   basisFilter字段值: "${rule.basisFilter}"`);

  try {
    const basisFilter = JSON.parse(rule.basisFilter);
    console.log(`   解析后的值:`, basisFilter);
  } catch (e) {
    console.log('   ❌ JSON解析失败');
  }

  console.log('\n7. 其他配置:');
  console.log(`   分摊依据: ${rule.allocationBasis}`);
  console.log(`   规则类型: ${rule.ruleType}`);
  console.log(`   排序: ${rule.sortOrder}`);
  console.log(`   状态: ${rule.status}`);
  console.log(`   描述: ${rule.description || '无'}`);
  console.log(`   有效期开始: ${rule.effectiveStartTime || '未设置'}`);
  console.log(`   有效期结束: ${rule.effectiveEndTime || '未设置'}`);

  console.log('\n=== 检查完成 ===');
}

checkRule7Detail()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
