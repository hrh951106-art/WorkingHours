const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSourceConfigTable() {
  console.log('🔍 查询AllocationSourceConfig表\n');
  console.log('═'.repeat(80));

  // 1. 查询AllocationSourceConfig表
  const sourceConfigs = await prisma.$queryRaw`
    SELECT id, "configId", "sourceType", "employeeFilter", "accountFilter",
           "attendanceCodes", "description", "createdAt", "updatedAt"
    FROM "AllocationSourceConfig"
    WHERE "configId" = 3
  `;

  console.log('\n1️⃣ AllocationSourceConfig表数据:');
  if (sourceConfigs && sourceConfigs.length > 0) {
    sourceConfigs.forEach((sc, idx) => {
      console.log(`\n记录${idx + 1}:`);
      console.log(`  ID: ${sc.id}`);
      console.log(`  configId: ${sc.configId}`);
      console.log(`  sourceType: ${sc.sourceType}`);
      console.log(`  employeeFilter: ${sc.employeeFilter}`);
      console.log(`  accountFilter: ${sc.accountFilter}`);
      console.log(`  attendanceCodes: ${sc.attendanceCodes}`);
      console.log(`  description: ${sc.description || '(无)'}`);
      console.log(`  创建时间: ${sc.createdAt}`);
      console.log(`  更新时间: ${sc.updatedAt}`);

      // 解析JSON字段
      console.log('\n  解析后的数据:');
      try {
        const employeeFilter = JSON.parse(sc.employeeFilter || '{}');
        const accountFilter = JSON.parse(sc.accountFilter || '{}');
        const attendanceCodes = JSON.parse(sc.attendanceCodes || '[]');

        console.log(`    员工筛选: ${JSON.stringify(employeeFilter, null, 6)}`);
        console.log(`    账户筛选: ${JSON.stringify(accountFilter, null, 6)}`);
        console.log(`    出勤代码: ${JSON.stringify(attendanceCodes, null, 6)}`);
      } catch (e) {
        console.log(`    解析失败: ${e.message}`);
      }
    });
  } else {
    console.log('  ❌ 未找到configId=3的记录');
  }

  // 2. 查询所有AllocationSourceConfig记录
  const allSourceConfigs = await prisma.$queryRaw`
    SELECT id, "configId", "sourceType", "attendanceCodes"
    FROM "AllocationSourceConfig"
    ORDER BY "configId" ASC
  `;

  console.log('\n2️⃣ 所有AllocationSourceConfig记录:');
  if (allSourceConfigs && allSourceConfigs.length > 0) {
    allSourceConfigs.forEach((sc) => {
      let attendanceCodes = '(无)';
      try {
        const parsed = JSON.parse(sc.attendanceCodes || '[]');
        attendanceCodes = JSON.stringify(parsed);
      } catch (e) {}

      console.log(`  configId=${sc.configId}, sourceType=${sc.sourceType}, 出勤代码=${attendanceCodes}`);
    });
  } else {
    console.log('  ❌ AllocationSourceConfig表中没有任何记录');
  }

  // 3. 使用Prisma关联查询
  console.log('\n3️⃣ 使用Prisma关联查询（模拟API）:');

  try {
    const configWithSource = await prisma.allocationConfig.findUnique({
      where: { id: 3 },
      include: {
        sourceConfig: true,
      },
    });

    if (configWithSource) {
      console.log('  配置ID:', configWithSource.id);
      console.log('  配置名称:', configWithSource.configName);

      if (configWithSource.sourceConfig) {
        console.log('\n  sourceConfig数据:');
        console.log(`    类型: ${Array.isArray(configWithSource.sourceConfig) ? '数组' : typeof configWithSource.sourceConfig}`);

        if (Array.isArray(configWithSource.sourceConfig)) {
          console.log(`    长度: ${configWithSource.sourceConfig.length}`);
          if (configWithSource.sourceConfig.length > 0) {
            const sc = configWithSource.sourceConfig[0];
            console.log('\n    第一条记录:');
            console.log(`      ID: ${sc.id}`);
            console.log(`      configId: ${sc.configId}`);
            console.log(`      sourceType: ${sc.sourceType}`);
            console.log(`      attendanceCodes: ${sc.attendanceCodes}`);
          }
        }
      } else {
        console.log('  ❌ sourceConfig为空');
      }
    }
  } catch (e) {
    console.log(`  ❌ 查询失败: ${e.message}`);
  }

  await prisma.$disconnect();
}

checkSourceConfigTable().catch(console.error);
