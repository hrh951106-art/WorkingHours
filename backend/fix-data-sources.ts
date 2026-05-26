import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDataSources() {
  console.log('开始修复数据源...');

  // 删除错误创建的 POSITION 数据源
  const positionDS = await prisma.dataSource.findUnique({
    where: { code: 'POSITION' }
  });

  if (positionDS) {
    await prisma.dataSourceOption.deleteMany({
      where: { dataSourceId: positionDS.id }
    });
    await prisma.dataSource.delete({
      where: { code: 'POSITION' }
    });
    console.log('✓ 删除重复的 POSITION 数据源');
  }

  // 验证结果
  const dataSources = await prisma.dataSource.findMany({
    where: {
      code: {
        in: ['JOB_POST', 'JOB_LEVEL', 'EMPLOYEE_TYPE', 'WORK_LOCATION', 'POSITION_TITLE', 'EMPLOYMENT_RELATION', 'COST_CENTER']
      }
    },
    orderBy: { code: 'asc' }
  });

  console.log('\n=== 当前可用的系统数据源 ===');
  dataSources.forEach(ds => {
    console.log(`${ds.name} (${ds.code})`);
  });

  console.log('\n数据源修复完成！');
}

fixDataSources()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
