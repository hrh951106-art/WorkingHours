import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function checkG02Results() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 检查G02分摊结果 ===\n');

  // 1. 查询最新的分摊结果
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      recordDate: new Date('2026-03-11'),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  console.log(`找到 ${allocationResults.length} 条分摊结果`);

  // 按batchNo分组
  const resultsByBatch: Record<string, any[]> = {};
  for (const result of allocationResults) {
    if (!resultsByBatch[result.batchNo]) {
      resultsByBatch[result.batchNo] = [];
    }
    resultsByBatch[result.batchNo].push(result);
  }

  console.log(`\n总批次: ${Object.keys(resultsByBatch).length}`);

  for (const batchNo in resultsByBatch) {
    console.log(`\n批次号: ${batchNo}`);
    console.log(`结果数: ${resultsByBatch[batchNo].length}`);

    for (const result of resultsByBatch[batchNo]) {
      console.log(`  - 源员工: ${result.sourceEmployeeName}, 源账户: ${result.sourceAccountName}`);
      console.log(`    目标: ${result.targetName} (${result.targetType})`);
      console.log(`    分摊依据: ${result.allocationBasis}`);
      console.log(`    基础值: ${result.basisValue}, 权重: ${result.weightValue}`);
      console.log(`    分摊系数: ${result.allocationRatio?.toFixed(4)}`);
      console.log(`    分摊工时: ${result.allocatedHours?.toFixed(4)}`);
      console.log(``);
    }
  }

  // 2. 查询分摊后生成的工时记录
  console.log(`\n=== 检查分摊后生成的工时记录 ===`);
  const generatedResults = await prisma.calcResult.findMany({
    where: {
      calcDate: new Date('2026-03-11'),
      attendanceCodeId: 6, // I06 - 间接工时
    },
    include: {
      attendanceCode: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  console.log(`找到 ${generatedResults.length} 条分摊后的工时记录`);
  for (const result of generatedResults) {
    console.log(`- 员工: ${result.employeeNo}, 出勤代码: ${result.attendanceCode?.name}, 实际工时: ${result.actualHours}, 账户: ${result.accountName}`);
  }

  console.log('\n=== 检查完成 ===');

  await app.close();
}

checkG02Results().catch(console.error);
