import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查岗位和职级数据源 ==========\n');

  // 检查岗位数据源
  console.log('【岗位数据源】');
  const positionDS = await prisma.dataSource.findFirst({
    where: {
      code: 'POSITION'
    },
    include: {
      options: {
        where: {
          value: {
            in: ['POST_012']
          }
        }
      }
    }
  });

  if (positionDS) {
    console.log(`数据源: ${positionDS.name} (${positionDS.code})`);
    console.log('选项:');
    positionDS.options.forEach(opt => {
      console.log(`  ${opt.label} (${opt.value})`);
    });
  }

  console.log('\n所有岗位选项:');
  const allPositions = await prisma.dataSourceOption.findMany({
    where: {
      dataSource: {
        code: 'POSITION'
      },
      isActive: true
    },
    include: {
      dataSource: true
    },
    orderBy: {
      sort: 'asc'
    }
  });

  allPositions.forEach(opt => {
    console.log(`  ${opt.label} (${opt.value})`);
  });

  // 检查职级数据源
  console.log('\n【职级数据源】');
  const jobLevelDS = await prisma.dataSource.findFirst({
    where: {
      code: 'JOB_LEVEL'
    },
    include: {
      options: {
        where: {
          value: {
            in: ['Level_005', 'Level_006']
          }
        }
      }
    }
  });

  if (jobLevelDS) {
    console.log(`数据源: ${jobLevelDS.name} (${jobLevelDS.code})`);
    console.log('选项:');
    jobLevelDS.options.forEach(opt => {
      console.log(`  ${opt.label} (${opt.value})`);
    });
  }

  console.log('\n所有职级选项:');
  const allJobLevels = await prisma.dataSourceOption.findMany({
    where: {
      dataSource: {
        code: 'JOB_LEVEL'
      },
      isActive: true
    },
    include: {
      dataSource: true
    },
    orderBy: {
      sort: 'asc'
    }
  });

  allJobLevels.forEach(opt => {
    console.log(`  ${opt.label} (${opt.value})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
