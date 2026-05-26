/**
 * 创建出勤代码映射示例数据
 *
 * 运行方式：
 * npm run ts-node create-attendance-code-mapping.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建出勤代码映射数据...\n');

  try {
    // 1. 检查现有的 CALCULATION 类型出勤代码
    console.log('1. 检查现有的 CALCULATION 类型出勤代码:');
    const calcCodes = await prisma.attendanceCode.findMany({
      where: { category: 'CALCULATION' },
      select: { id: true, code: true, name: true },
    });

    if (calcCodes.length === 0) {
      console.log('   ⚠️  未找到 CALCULATION 类型的出勤代码');
      console.log('   请先创建计算出勤代码（A01, A02, A03 等）\n');
      return;
    }

    console.log('   找到以下计算出勤代码:');
    calcCodes.forEach(code => {
      console.log(`   - ${code.code}: ${code.name}`);
    });
    console.log('');

    // 2. 创建 DEFINITION 类型的出勤代码（如果不存在）
    console.log('2. 创建 DEFINITION 类型的出勤代码:');

    const definitionCodes = [
      {
        code: 'NORMAL_WORK',
        name: '正常工时',
        calcAttendanceCode: 'A01', // 对应计算的 A01
        type: 'LEAN_HOURS',
        unit: 'HOURS',
        calculateHours: true,
        showInDetailPage: true,
        priority: 1,
        color: '#52c41a',
      },
      {
        code: 'PRODUCTION_WORK',
        name: '生产工时',
        calcAttendanceCode: 'A02', // 对应计算的 A02
        type: 'LEAN_HOURS',
        unit: 'HOURS',
        calculateHours: true,
        showInDetailPage: true,
        priority: 2,
        color: '#1890ff',
      },
      {
        code: 'ALLOCATION_WORK',
        name: '分摊工时',
        calcAttendanceCode: 'A03', // 对应计算的 A03
        type: 'LEAN_HOURS',
        unit: 'HOURS',
        calculateHours: true,
        showInDetailPage: true,
        priority: 3,
        color: '#faad14',
      },
      {
        code: 'OVERTIME_WORK',
        name: '加班工时',
        calcAttendanceCode: 'A04',
        type: 'LEAN_HOURS',
        unit: 'HOURS',
        calculateHours: true,
        showInDetailPage: true,
        priority: 4,
        color: '#f5222d',
      },
      {
        code: 'LEAVE_WORK',
        name: '请假工时',
        calcAttendanceCode: 'A05',
        type: 'LEAN_HOURS',
        unit: 'HOURS',
        calculateHours: false,
        showInDetailPage: true,
        priority: 5,
        color: '#722ed1',
      },
      {
        code: 'HOLIDAY_WORK',
        name: '节假日工时',
        calcAttendanceCode: 'A06',
        type: 'LEAN_HOURS',
        unit: 'HOURS',
        calculateHours: true,
        showInDetailPage: true,
        priority: 6,
        color: '#eb2f96',
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const codeData of definitionCodes) {
      // 检查是否已存在
      const existing = await prisma.attendanceCode.findUnique({
        where: { code: codeData.code },
      });

      if (existing) {
        // 更新现有记录
        if (existing.category !== 'DEFINITION') {
          console.log(`   ⚠️  ${codeData.code}: 已存在但分类不是 DEFINITION，跳过`);
          skippedCount++;
          continue;
        }

        await prisma.attendanceCode.update({
          where: { id: existing.id },
          data: {
            ...codeData,
            category: 'DEFINITION',
            status: 'ACTIVE',
          },
        });
        console.log(`   ✓ ${codeData.code}: 更新成功 (映射到 ${codeData.calcAttendanceCode})`);
        updatedCount++;
      } else {
        // 创建新记录
        await prisma.attendanceCode.create({
          data: {
            ...codeData,
            category: 'DEFINITION',
            status: 'ACTIVE',
          },
        });
        console.log(`   ✓ ${codeData.code}: 创建成功 (映射到 ${codeData.calcAttendanceCode})`);
        createdCount++;
      }
    }

    console.log('');
    console.log(`创建完成：`);
    console.log(`   - 新增: ${createdCount} 条`);
    console.log(`   - 更新: ${updatedCount} 条`);
    console.log(`   - 跳过: ${skippedCount} 条`);
    console.log('');

    // 3. 验证映射关系
    console.log('3. 验证映射关系:');
    const mappings = await prisma.attendanceCode.findMany({
      where: {
        category: 'DEFINITION',
        calcAttendanceCode: { not: null },
      },
      include: {
        // Prisma 会自动通过 calcAttendanceCode 关联
        // 但由于是字符串字段，需要手动查询
      },
      orderBy: { priority: 'asc' },
    });

    console.log('   当前有效的映射关系:');
    console.log('   ┌──────────────┬────────────┬─────────────┬────────────┐');
    console.log('   │ 定义代码     │ 定义名称    │ 映射计算代码│ 状态       │');
    console.log('   ├──────────────┼────────────┼─────────────┼────────────┤');

    for (const mapping of mappings) {
      // 查找对应的计算代码
      const calcCode = calcCodes.find(c => c.code === mapping.calcAttendanceCode);
      const calcCodeName = calcCode ? calcCode.name : '未找到';

      console.log(
        `   │ ${mapping.code.padEnd(12)} │ ${(mapping.name || '').padEnd(10)} │ ` +
        `${(mapping.calcAttendanceCode || '').padEnd(11)} │ ` +
        `${mapping.status === 'ACTIVE' ? '✓ 启用' : '✗ 禁用'}`
      );
    }

    console.log('   └──────────────┴────────────┴─────────────┴────────────┘');
    console.log('');

    // 4. 检查孤立的映射
    console.log('4. 检查数据一致性:');

    const orphanMappings = await prisma.attendanceCode.findMany({
      where: {
        category: 'DEFINITION',
        calcAttendanceCode: { not: null },
      },
    });

    let orphanCount = 0;
    for (const mapping of orphanMappings) {
      const calcCodeExists = calcCodes.some(c => c.code === mapping.calcAttendanceCode);
      if (!calcCodeExists) {
        console.log(`   ⚠️  ${mapping.code}: 映射的代码 ${mapping.calcAttendanceCode} 不存在`);
        orphanCount++;
      }
    }

    if (orphanCount === 0) {
      console.log('   ✓ 所有映射关系正常');
    } else {
      console.log(`   ✗ 发现 ${orphanCount} 个孤立的映射关系`);
    }

    console.log('');
    console.log('✅ 出勤代码映射数据初始化完成！\n');
  } catch (error) {
    console.error('❌ 创建失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
