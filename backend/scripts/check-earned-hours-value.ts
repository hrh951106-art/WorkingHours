import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const recordDate = '2026-05-07';

  console.log('查询个人产量记录的挣得工时字段值\n');

  const record = await prisma.personalProductionRecord.findFirst({
    where: {
      recordDate: new Date(recordDate),
      employeeNo: employeeNo,
      deletedAt: null,
    },
    select: {
      id: true,
      recordDate: true,
      employeeNo: true,
      productName: true,
      actualQty: true,
      standardHours: true,
      earnedHours: true,
      recordedAt: true,
    },
  });

  if (record) {
    console.log('=== 个人产量记录 ===');
    console.log(`ID: ${record.id}`);
    console.log(`日期: ${record.recordDate.toISOString().substring(0, 10)}`);
    console.log(`员工: ${record.employeeNo}`);
    console.log(`产品: ${record.productName}`);
    console.log(`实际产量: ${record.actualQty}`);
    console.log(`标准工时字段值: ${record.standardHours}`);
    console.log(`挣得工时字段值: ${record.earnedHours}`);
    console.log(`记录时间: ${record.recordedAt.toISOString().substring(0, 19).replace('T', ' ')}`);
    console.log('');

    // 计算分析
    console.log('=== 计算分析 ===');
    console.log(`如果使用配置1（100件=1.5小时）: (${record.actualQty} / 100) × 1.5 = ${(record.actualQty / 100) * 1.5} 小时`);
    console.log(`如果使用配置2（100件=1小时）: (${record.actualQty} / 100) × 1 = ${(record.actualQty / 100) * 1} 小时`);
    console.log('');
    console.log(`实际记录的挣得工时: ${record.earnedHours} 小时`);
    console.log('');

    // 推断
    const expectedFromConfig1 = (record.actualQty / 100) * 1.5;
    const expectedFromConfig2 = (record.actualQty / 100) * 1;

    if (Math.abs(record.earnedHours - expectedFromConfig1) < 0.01) {
      console.log('⚠️  结论: 实际使用的是配置1（100件=1.5小时）');
      console.log('⚠️  问题: 2026-05-07应该匹配配置2（100件=1小时），但实际使用了配置1');
    } else if (Math.abs(record.earnedHours - expectedFromConfig2) < 0.01) {
      console.log('✓ 结论: 实际使用的是配置2（100件=1小时），计算正确');
    } else {
      console.log(`? 结论: 使用了其他配置，计算值: ${record.earnedHours}`);
    }
  } else {
    console.log('未找到记录');
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  });
