import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkI04AllRecords() {
  console.log('========================================');
  console.log('检查I04车间工时的所有记录（不限日期）');
  console.log('========================================\n');

  // 1. 查询所有I04记录
  console.log('第一步：查询所有I04车间工时记录\n');

  const allI04Records = await prisma.calcResult.findMany({
    where: {
      attendanceCodeId: 6, // I04
    },
    orderBy: {
      calcDate: 'desc',
    },
  });

  console.log(`I04车间工时记录总数: ${allI04Records.length}\n`);

  if (allI04Records.length > 0) {
    for (const record of allI04Records) {
      console.log(`账户: ${record.accountName}`);
      console.log(`员工: ${record.employeeNo}, 工时: ${record.actualHours}, 日期: ${record.calcDate.toISOString().split('T')[0]}`);
      console.log();
    }
  } else {
    console.log('没有找到任何I04车间工时记录');
  }

  // 2. 检查分摊结果
  console.log('\n第二步：检查分摊结果记录\n');

  const allocationResults = await prisma.allocationResult.findMany({
    orderBy: {
      recordDate: 'desc',
    },
    take: 10,
  });

  console.log(`分摊结果记录总数: ${allocationResults.length} (显示最近10条)\n`);

  for (const result of allocationResults) {
    console.log(`批次号: ${result.batchNo}`);
    console.log(`日期: ${result.recordDate.toISOString().split('T')[0]}`);
    console.log(`源账户: ${result.sourceAccountName || 'Unknown'}`);
    console.log(`目标名称: ${result.targetName || 'Unknown'}`);
    console.log(`配置ID: ${result.configId}, 规则ID: ${result.ruleId}`);
    console.log(`分摊工时: ${result.allocatedHours}`);
    console.log();
  }

  // 3. 检查是否有间接设备的工时记录
  console.log('\n第三步：检查间接设备的工时记录\n');

  const indirectRecords = await prisma.calcResult.findMany({
    where: {
      accountName: {
        endsWith: '间接设备',
      },
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 20,
  });

  console.log(`间接设备工时记录: ${indirectRecords.length} 条 (显示最近20条)\n`);

  if (indirectRecords.length > 0) {
    for (const record of indirectRecords) {
      const code = await prisma.attendanceCode.findUnique({
        where: { id: record.attendanceCodeId || 0 },
      });

      console.log(`账户: ${record.accountName}`);
      console.log(`出勤代码: ${code?.code || 'NULL'} (${code?.name || 'Unknown'})`);
      console.log(`员工: ${record.employeeNo}, 工时: ${record.actualHours}, 日期: ${record.calcDate.toISOString().split('T')[0]}`);
      console.log();
    }
  } else {
    console.log('没有找到任何间接设备的工时记录');
  }

  console.log('========================================\n');
}

checkI04AllRecords()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
