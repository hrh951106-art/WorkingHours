const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSourceConfigStructure() {
  console.log('🔍 测试Prisma关联查询返回的sourceConfig结构\n');
  console.log('═'.repeat(80));

  // 模拟分摊计算的查询方式
  const config = await prisma.allocationConfig.findUnique({
    where: { id: 3, deletedAt: null },
    include: {
      sourceConfig: true,
      rules: {
        where: { deletedAt: null, status: 'ACTIVE' },
        include: {
          targets: true,
        },
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
  });

  if (!config) {
    console.log('❌ 未找到配置');
    await prisma.$disconnect();
    return;
  }

  console.log('\n1️⃣ 基本信息:');
  console.log(`  配置ID: ${config.id}`);
  console.log(`  配置名称: ${config.configName}`);
  console.log(`  配置状态: ${config.status}`);

  console.log('\n2️⃣ sourceConfig结构:');
  console.log(`  是否存在: ${!!config.sourceConfig}`);
  console.log(`  类型: ${Array.isArray(config.sourceConfig) ? '数组' : typeof config.sourceConfig}`);

  if (Array.isArray(config.sourceConfig)) {
    console.log(`  数组长度: ${config.sourceConfig.length}`);

    if (config.sourceConfig.length > 0) {
      const first = config.sourceConfig[0];
      console.log('\n  第一条记录的结构:');
      console.log(`    id: ${first.id}`);
      console.log(`    configId: ${first.configId}`);
      console.log(`    sourceType: ${first.sourceType}`);
      console.log(`    employeeFilter: ${first.employeeFilter}`);
      console.log(`    accountFilter: ${first.accountFilter}`);
      console.log(`    attendanceCodes: ${first.attendanceCodes}`);

      console.log('\n  ⚠️  问题分析:');
      console.log('    sourceConfig是数组，但分摊计算代码直接访问属性：');
      console.log('    config.sourceConfig.employeeFilter ❌');
      console.log('    ');
      console.log('    应该改为：');
      console.log('    config.sourceConfig[0].employeeFilter ✅');

      // 测试解析
      try {
        const employeeFilter = JSON.parse(first.employeeFilter || '{}');
        const accountFilter = JSON.parse(first.accountFilter || '{}');
        const attendanceCodes = JSON.parse(first.attendanceCodes || '[]');

        console.log('\n  解析后的数据:');
        console.log(`    employeeFilter: ${JSON.stringify(employeeFilter)}`);
        console.log(`    accountFilter: ${JSON.stringify(accountFilter)}`);
        console.log(`    attendanceCodes: ${JSON.stringify(attendanceCodes)}`);
      } catch (e) {
        console.log(`    ❌ 解析失败: ${e.message}`);
      }
    }
  } else if (config.sourceConfig && typeof config.sourceConfig === 'object') {
    console.log('\n  sourceConfig是对象，包含字段:');
    Object.keys(config.sourceConfig).forEach(key => {
      console.log(`    - ${key}`);
    });
  }

  console.log('\n3️⃣ 模拟分摊计算代码的访问方式:');

  // 当前代码的方式（会失败）
  console.log('\n  当前代码（错误）:');
  try {
    const employeeFilter = JSON.parse(config.sourceConfig.employeeFilter || '{}');
    console.log(`    ✅ 意外成功: ${JSON.stringify(employeeFilter)}`);
  } catch (e) {
    console.log(`    ❌ 失败: ${e.message}`);
    console.log(`       原因: sourceConfig是${Array.isArray(config.sourceConfig) ? '数组' : typeof config.sourceConfig}，不能直接访问.employeeFilter属性`);
  }

  // 正确的方式
  console.log('\n  正确代码:');
  if (Array.isArray(config.sourceConfig) && config.sourceConfig.length > 0) {
    try {
      const sc = config.sourceConfig[0];
      const employeeFilter = JSON.parse(sc.employeeFilter || '{}');
      const accountFilter = JSON.parse(sc.accountFilter || '{}');
      const attendanceCodes = JSON.parse(sc.attendanceCodes || '[]');

      console.log(`    ✅ 成功解析:`);
      console.log(`      employeeFilter: ${JSON.stringify(employeeFilter)}`);
      console.log(`      accountFilter: ${JSON.stringify(accountFilter)}`);
      console.log(`      attendanceCodes: ${JSON.stringify(attendanceCodes)}`);
    } catch (e) {
      console.log(`    ❌ 失败: ${e.message}`);
    }
  }

  console.log('\n4️⃣ 结论:');
  if (Array.isArray(config.sourceConfig)) {
    console.log('  ❌ 【问题根源】');
    console.log('     sourceConfig是数组结构，但分摊计算代码把它当作对象使用');
    console.log('  ');
    console.log('  【修复方案】');
    console.log('     allocation.service.ts:2351-2353 行需要修改：');
    console.log('  ');
    console.log('  修改前：');
    console.log('    const employeeFilter = JSON.parse(config.sourceConfig.employeeFilter || \'{}\');');
    console.log('  ');
    console.log('  修改后：');
    console.log('    const sc = Array.isArray(config.sourceConfig) ? config.sourceConfig[0] : config.sourceConfig;');
    console.log('    const employeeFilter = JSON.parse(sc.employeeFilter || \'{}\');');
  } else {
    console.log('  ✅ sourceConfig结构正常，不是问题所在');
  }

  await prisma.$disconnect();
}

testSourceConfigStructure().catch(console.error);
