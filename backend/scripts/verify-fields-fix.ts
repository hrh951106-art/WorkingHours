import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 验证 definitionAttendanceCodeStr 和 source 字段修复
 */

async function main() {
  console.log('=== 验证字段修复 ===\n');

  // 1. 查询工时申报数据
  console.log('1. 查询工时申报的 WorkHourResult 数据:\n');
  const reportedResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: 'LABOR_HOUR_REPORT',
    },
    select: {
      id: true,
      definitionAttendanceCodeId: true,
      definitionAttendanceCodeStr: true,
      source: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`找到 ${reportedResults.length} 条工时申报数据\n`);

  if (reportedResults.length > 0) {
    console.log('数据详情:');
    reportedResults.forEach((result) => {
      console.log(`  ID: ${result.id}`);
      console.log(`  definitionAttendanceCodeId: ${result.definitionAttendanceCodeId}`);
      console.log(`  definitionAttendanceCodeStr: "${result.definitionAttendanceCodeStr}"`);
      console.log(`  source: "${result.source}"`);
      console.log(`  创建时间: ${result.createdAt.toISOString()}`);
      console.log('  ---');
    });

    // 2. 验证 definitionAttendanceCodeStr
    console.log('\n2. 验证 definitionAttendanceCodeStr 字段:\n');

    const definitionCodes = await prisma.definitionAttendanceCode.findMany({
      where: {
        id: {
          in: reportedResults.map(r => r.definitionAttendanceCodeId).filter((id): id is number => id !== null) as number[],
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    console.log('与 DefinitionAttendanceCode 表对比:');
    reportedResults.forEach((result) => {
      const defCode = definitionCodes.find(d => d.id === result.definitionAttendanceCodeId);
      if (defCode) {
        const isCode = result.definitionAttendanceCodeStr === defCode.code;
        const isName = result.definitionAttendanceCodeStr === defCode.name;

        console.log(`  WorkHourResult ID: ${result.id}`);
        console.log(`    存储值: "${result.definitionAttendanceCodeStr}"`);
        console.log(`    代码: "${defCode.code}" ${isCode ? '✓ 匹配' : '✗ 不匹配'}`);
        console.log(`    名称: "${defCode.name}" ${isName ? '✗ 不应使用名称' : '✓ 未使用名称'}`);
        console.log('');
      }
    });

    // 统计
    const correctCount = reportedResults.filter(r => {
      const defCode = definitionCodes.find(d => d.id === r.definitionAttendanceCodeId);
      return defCode && r.definitionAttendanceCodeStr === defCode.code;
    }).length;

    console.log(`definitionAttendanceCodeStr 正确率: ${correctCount}/${reportedResults.length} (${((correctCount / reportedResults.length) * 100).toFixed(1)}%)`);

    // 3. 验证 source 字段
    console.log('\n3. 验证 source 字段:\n');

    const sourceStats = {
      '工时报工': 0,
      '工时报表申请': 0,
      '其他': 0,
    };

    reportedResults.forEach((result) => {
      if (result.source === '工时报工') {
        sourceStats['工时报工']++;
      } else if (result.source?.startsWith('工时报表申请')) {
        sourceStats['工时报表申请']++;
      } else {
        sourceStats['其他']++;
      }
    });

    console.log('source 字段分布:');
    console.log(`  "工时报工" (✓ 正确): ${sourceStats['工时报工']} 条`);
    console.log(`  "工时报表申请..." (✗ 旧格式): ${sourceStats['工时报表申请']} 条`);
    console.log(`  其他: ${sourceStats['其他']} 条`);

    // 4. 与计算推送数据对比
    console.log('\n4. 与计算推送数据对比:\n');

    const calculatedResults = await prisma.workHourResult.findMany({
      where: {
        sourceType: {
          in: ['LEAN', 'ATTENDANCE'],
        },
      },
      select: {
        id: true,
        definitionAttendanceCodeId: true,
        definitionAttendanceCodeStr: true,
        source: true,
      },
      take: 3,
    });

    if (calculatedResults.length > 0) {
      console.log('计算推送数据示例:');
      calculatedResults.forEach((calc) => {
        const defCode = definitionCodes.find(d => d.id === calc.definitionAttendanceCodeId);
        console.log(`  ID: ${calc.id}`);
        console.log(`  definitionAttendanceCodeStr: "${calc.definitionAttendanceCodeStr}" ${defCode && calc.definitionAttendanceCodeStr === defCode.code ? '✓ 代码格式' : '✗ 非代码格式'}`);
        console.log(`  source: "${calc.source || 'null'}"`);
        console.log('  ---');
      });
    }

    // 5. 总体验证结论
    console.log('\n5. 验证结论:\n');

    const newRecords = reportedResults.filter(r => r.createdAt > new Date(Date.now() - 1000 * 60 * 10)); // 最近10分钟
    const newCorrectCode = newRecords.filter(r => {
      const defCode = definitionCodes.find(d => d.id === r.definitionAttendanceCodeId);
      return defCode && r.definitionAttendanceCodeStr === defCode.code;
    }).length;
    const newCorrectSource = newRecords.filter(r => r.source === '工时报工').length;

    if (newRecords.length > 0) {
      if (newCorrectCode === newRecords.length && newCorrectSource === newRecords.length) {
        console.log('✅ 修复成功！新的工时申报数据字段格式正确');
      } else {
        console.log('⚠️ 部分新数据字段格式不正确');
        console.log(`  definitionAttendanceCodeStr: ${newCorrectCode}/${newRecords.length} 正确`);
        console.log(`  source: ${newCorrectSource}/${newRecords.length} 正确`);
      }
    } else {
      console.log('⚠️ 尚未检测到新的工时申报数据');
      console.log('  请在前端创建一个新的工时报表申请来验证修复');
    }

    if (correctCount < reportedResults.length) {
      console.log(`\n⚠️ 仍有 ${reportedResults.length - correctCount} 条旧数据的 definitionAttendanceCodeStr 使用名称格式`);
    }
    if (sourceStats['工时报表申请'] > 0) {
      console.log(`⚠️ 仍有 ${sourceStats['工时报表申请']} 条旧数据的 source 使用详细描述格式`);
    }

  } else {
    console.log('⚠️ 没有找到工时申报数据');
    console.log('  请在前端创建一个新的工时报表申请来验证修复');
  }

  // 6. 显示正确的格式示例
  console.log('\n6. 正确的格式示例:\n');

  const exampleDefCode = await prisma.definitionAttendanceCode.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, code: true, name: true },
  });

  if (exampleDefCode) {
    console.log('definitionAttendanceCodeStr 字段:');
    console.log(`  ✅ 正确: "${exampleDefCode.code}" (代码)`);
    console.log(`  ❌ 错误: "${exampleDefCode.name}" (名称)`);
  }

  console.log('\nsource 字段:');
  console.log(`  ✅ 正确: "工时报工"`);
  console.log(`  ❌ 错误: "工时报表申请: Aaron.he - 作业工时 - 2026-05-28"`);
}

main()
  .then(() => {
    console.log('\n✅ 验证完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
