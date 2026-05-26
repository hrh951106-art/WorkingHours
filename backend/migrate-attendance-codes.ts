import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAttendanceCodes() {
  console.log('========================================');
  console.log('出勤代码表数据迁移');
  console.log('========================================\n');

  try {
    // 1. 查询现有的 AttendanceCode 数据
    console.log('1️⃣ 查询现有数据...');
    const existingCodes = await prisma.attendanceCode.findMany({
      orderBy: { id: 'asc' },
    });

    console.log(`找到 ${existingCodes.length} 条出勤代码记录\n`);

    if (existingCodes.length === 0) {
      console.log('⚠️  没有数据需要迁移');
      return;
    }

    // 2. 分离 CALCULATION 和 DEFINITION 类型的数据
    console.log('2️⃣ 分离数据类型...');
    const calculationCodes = existingCodes.filter(code => code.category === 'CALCULATION');
    const definitionCodes = existingCodes.filter(code => code.category === 'DEFINITION');

    console.log(`  - CALCULATION 类型: ${calculationCodes.length} 条`);
    console.log(`  - DEFINITION 类型: ${definitionCodes.length} 条\n`);

    // 3. 迁移 CALCULATION 类型的数据到 CalculationAttendanceCode 表
    console.log('3️⃣ 迁移计算出勤代码...');
    let calculationMigrationCount = 0;
    const calculationCodeMap = new Map<number, number>(); // 旧ID -> 新ID

    for (const code of calculationCodes) {
      try {
        const newCode = await prisma.calculationAttendanceCode.create({
          data: {
            code: code.code,
            name: code.name,
            type: code.type || 'LEAN_HOURS',
            unit: code.unit || 'HOURS',
            deductMeal: code.deductMeal ?? false,
            includeOutside: code.includeOutside ?? false,
            onlyOutside: code.onlyOutside ?? false,
            calculateHours: code.calculateHours ?? true,
            priority: code.priority ?? 0,
            color: code.color || '#1890ff',
            status: code.status || 'ACTIVE',
            description: null, // AttendanceCode 没有此字段
            createdAt: code.createdAt,
            updatedAt: code.updatedAt,
          },
        });

        calculationCodeMap.set(code.id, newCode.id);
        calculationMigrationCount++;

        console.log(`  ✅ [${code.code}] ${code.name} -> 新ID: ${newCode.id}`);
      } catch (error) {
        console.error(`  ❌ 迁移失败 [${code.code}]: ${error}`);
      }
    }

    console.log(`\n✅ 成功迁移 ${calculationMigrationCount} 条计算出勤代码\n`);

    // 4. 迁移 DEFINITION 类型的数据到 DefinitionAttendanceCode 表
    console.log('4️⃣ 迁移定义出勤代码...');
    let definitionMigrationCount = 0;
    const definitionCodeMap = new Map<number, number>(); // 旧ID -> 新ID

    for (const code of definitionCodes) {
      try {
        const newCode = await prisma.definitionAttendanceCode.create({
          data: {
            code: code.code,
            name: code.name,
            type: code.type || 'LEAN_HOURS',
            unit: code.unit || 'HOURS',
            calculateHours: code.calculateHours ?? true,
            showInDetailPage: false,
            priority: code.priority ?? 0,
            color: code.color || '#1890ff',
            status: code.status || 'ACTIVE',
            calcAttendanceCode: code.calcAttendanceCode,
            description: null, // AttendanceCode 没有此字段
            createdAt: code.createdAt,
            updatedAt: code.updatedAt,
          },
        });

        definitionCodeMap.set(code.id, newCode.id);
        definitionMigrationCount++;

        console.log(`  ✅ [${code.code}] ${code.name} -> 新ID: ${newCode.id}`);
      } catch (error) {
        console.error(`  ❌ 迁移失败 [${code.code}]: ${error}`);
      }
    }

    console.log(`\n✅ 成功迁移 ${definitionMigrationCount} 条定义出勤代码\n`);

    // 5. 更新 CalcResult 表的外键
    console.log('5️⃣ 更新 CalcResult 表外键...');
    const calcResults = await prisma.calcResult.findMany({
      where: {
        attendanceCodeId: { not: null },
      },
    });

    console.log(`  找到 ${calcResults.length} 条需要更新的 CalcResult 记录`);

    let calcResultUpdateCount = 0;
    for (const result of calcResults) {
      if (result.attendanceCodeId && calculationCodeMap.has(result.attendanceCodeId)) {
        const newCodeId = calculationCodeMap.get(result.attendanceCodeId)!;
        try {
          await prisma.calcResult.update({
            where: { id: result.id },
            data: { calculationAttendanceCodeId: newCodeId },
          });
          calcResultUpdateCount++;
          console.log(`  ✅ CalcResult ID ${result.id}: attendanceCodeId ${result.attendanceCodeId} -> calculationAttendanceCodeId ${newCodeId}`);
        } catch (error) {
          console.error(`  ❌ 更新失败 CalcResult ID ${result.id}: ${error}`);
        }
      }
    }

    console.log(`\n✅ 成功更新 ${calcResultUpdateCount} 条 CalcResult 记录\n`);

    // 6. 更新 WorkHourResult 表的外键
    console.log('6️⃣ 更新 WorkHourResult 表外键...');
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        attendanceCodeId: { not: null },
      },
    });

    console.log(`  找到 ${workHourResults.length} 条需要更新的 WorkHourResult 记录`);

    let workHourResultUpdateCount = 0;
    for (const result of workHourResults) {
      if (result.attendanceCodeId && definitionCodeMap.has(result.attendanceCodeId)) {
        const newCodeId = definitionCodeMap.get(result.attendanceCodeId)!;
        try {
          await prisma.workHourResult.update({
            where: { id: result.id },
            data: { definitionAttendanceCodeId: newCodeId },
          });
          workHourResultUpdateCount++;
          console.log(`  ✅ WorkHourResult ID ${result.id}: attendanceCodeId ${result.attendanceCodeId} -> definitionAttendanceCodeId ${newCodeId}`);
        } catch (error) {
          console.error(`  ❌ 更新失败 WorkHourResult ID ${result.id}: ${error}`);
        }
      }
    }

    console.log(`\n✅ 成功更新 ${workHourResultUpdateCount} 条 WorkHourResult 记录\n`);

    // 7. 更新 AllocationWorkHour 表的外键
    console.log('7️⃣ 更新 AllocationWorkHour 表外键...');
    const allocationWorkHours = await prisma.allocationWorkHour.findMany({
      where: {
        attendanceCodeId: { not: null },
      },
    });

    console.log(`  找到 ${allocationWorkHours.length} 条需要更新的 AllocationWorkHour 记录`);

    let allocationWorkHourUpdateCount = 0;
    for (const record of allocationWorkHours) {
      if (record.attendanceCodeId && definitionCodeMap.has(record.attendanceCodeId)) {
        const newCodeId = definitionCodeMap.get(record.attendanceCodeId)!;
        try {
          await prisma.allocationWorkHour.update({
            where: { id: record.id },
            data: { definitionAttendanceCodeId: newCodeId },
          });
          allocationWorkHourUpdateCount++;
          console.log(`  ✅ AllocationWorkHour ID ${record.id}: attendanceCodeId ${record.attendanceCodeId} -> definitionAttendanceCodeId ${newCodeId}`);
        } catch (error) {
          console.error(`  ❌ 更新失败 AllocationWorkHour ID ${record.id}: ${error}`);
        }
      }
    }

    console.log(`\n✅ 成功更新 ${allocationWorkHourUpdateCount} 条 AllocationWorkHour 记录\n`);

    // 8. 验证迁移结果
    console.log('8️⃣ 验证迁移结果...\n');

    const calculationCount = await prisma.calculationAttendanceCode.count();
    const definitionCount = await prisma.definitionAttendanceCode.count();

    console.log('========================================');
    console.log('📊 迁移统计');
    console.log('========================================');
    console.log(`  原始数据总量: ${existingCodes.length} 条`);
    console.log(`  - CALCULATION: ${calculationCodes.length} 条`);
    console.log(`  - DEFINITION: ${definitionCodes.length} 条`);
    console.log(`\n  迁移后数据总量:`);
    console.log(`  - CalculationAttendanceCode: ${calculationCount} 条`);
    console.log(`  - DefinitionAttendanceCode: ${definitionCount} 条`);
    console.log(`\n  外键更新数量:`);
    console.log(`  - CalcResult: ${calcResultUpdateCount} 条`);
    console.log(`  - WorkHourResult: ${workHourResultUpdateCount} 条`);
    console.log(`  - AllocationWorkHour: ${allocationWorkHourUpdateCount} 条`);
    console.log('========================================\n');

    console.log('✅ 数据迁移完成！');
  } catch (error) {
    console.error('❌ 迁移过程中出现错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行迁移
migrateAttendanceCodes()
  .then(() => {
    console.log('\n🎉 迁移脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 迁移脚本执行失败:', error);
    process.exit(1);
  });
