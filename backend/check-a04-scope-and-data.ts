import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查询范围配置（ID=5）===\n');
  
  const scopeConfig = await prisma.allocationScopeConfig.findUnique({
    where: { id: 5 },
    include: {
      level: true,
    }
  });
  
  if (scopeConfig) {
    console.log('📌 范围配置:');
    console.log('- ID:', scopeConfig.id);
    console.log('- 名称:', scopeConfig.configName);
    console.log('- 层级:', scopeConfig.level?.levelName, '(ID:', scopeConfig.levelId, ')');
    console.log('- 优先级:', scopeConfig.priority);
    console.log('- 账户过滤:', scopeConfig.accountFilter);
  } else {
    console.log('❌ 未找到范围配置 ID=5');
  }
  
  console.log('\n\n=== 查询 A04_WORKSHOP 考勤代码 ===\n');
  
  const attendanceCode = await prisma.attendanceCode.findFirst({
    where: { code: 'A04_WORKSHOP' },
  });
  
  if (attendanceCode) {
    console.log('✅ 找到考勤代码:');
    console.log('- ID:', attendanceCode.id);
    console.log('- 编码:', attendanceCode.code);
    console.log('- 名称:', attendanceCode.name);
    console.log('- 类型:', attendanceCode.type);
  } else {
    console.log('❌ 未找到 A04_WORKSHOP 考勤代码');
  }
  
  console.log('\n\n=== 查询符合条件的工时数据 ===\n');
  
  // 查询有 A04_WORKSHOP 考勤代码的工时结果
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      attendanceCode: 'A04_WORKSHOP',
      deletedAt: null,
    },
    take: 10,
    orderBy: { workDate: 'desc' },
  });
  
  console.log(`📊 找到 ${workHourResults.length} 条 A04_WORKSHOP 工时记录`);
  
  if (workHourResults.length > 0) {
    console.log('\n前几条记录:');
    for (const wh of workHourResults.slice(0, 5)) {
      const dateStr = new Date(wh.workDate).toISOString().split('T')[0];
      console.log(`- 员工 ${wh.employeeNo} (${wh.employeeName}): ${wh.workHours}h, 日期: ${dateStr}`);
    }
  } else {
    console.log('❌ 没有找到工时数据');
    
    // 查询所有考勤代码看看有什么
    console.log('\n=== 查询��有考勤代码 ===\n');
    const allCodes = await prisma.workHourResult.groupBy({
      by: ['attendanceCode'],
      _count: true,
    });
    
    console.log('现有考勤代码及数量:');
    for (const code of allCodes) {
      console.log(`- ${code.attendanceCode}: ${code._count} 条`);
    }
  }
  
  console.log('\n\n=== 查询工厂ID=4的组织 ===\n');
  
  const org = await prisma.organization.findUnique({
    where: { id: 4 },
  });
  
  if (org) {
    console.log('🏭 工厂信息:');
    console.log('- ID:', org.id);
    console.log('- 名称:', org.orgName);
    console.log('- 类型:', org.orgType);
    console.log('- 层级:', org.hierarchyLevel);
  } else {
    console.log('❌ 未找到工厂ID=4');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
