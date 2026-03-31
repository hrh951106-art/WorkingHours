import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 系统内置字段列表
const SYSTEM_FIELDS = [
  'employeeNo',
  'name',
  'gender',
  'age',
  'idCard',
  'phone',
  'email',
  'department',
  'position',
  'jobLevel',
  'entryDate',
  'workStatus',
  ' ProbationEndDate',
  'regularDate',
  'address',
  'emergencyContact',
  'emergencyPhone',
];

async function fixSystemFields() {
  console.log('开始检查和修复系统内置字段...\n');

  // 1. 查找所有字段
  const allFields = await prisma.employeeInfoTabField.findMany({
    select: {
      id: true,
      fieldCode: true,
      fieldName: true,
      isSystem: true,
      tabId: true,
    },
  });

  console.log(`数据库中共有 ${allFields.length} 个字段记录\n`);

  // 2. 按fieldCode分组查找重复字段
  const fieldGroups = new Map<string, any[]>();
  allFields.forEach((field) => {
    const code = field.fieldCode;
    if (!fieldGroups.has(code)) {
      fieldGroups.set(code, []);
    }
    fieldGroups.get(code)!.push(field);
  });

  // 3. 找出重复的字段
  console.log('检查重复字段：');
  const duplicates: Array<{ code: string; fields: any[] }> = [];
  for (const [code, fields] of fieldGroups.entries()) {
    if (fields.length > 1) {
      duplicates.push({ code, fields });
      console.log(`  - ${code}: ${fields.length} 条记录`);
      fields.forEach((f) => {
        console.log(`    ID: ${f.id}, isSystem: ${f.isSystem}, tabId: ${f.tabId}`);
      });
    }
  }

  if (duplicates.length === 0) {
    console.log('  没有发现重复字段\n');
  } else {
    console.log(`  发现 ${duplicates.length} 组重复字段\n`);
  }

  // 4. 修复isSystem标识
  console.log('修复系统内置字段的isSystem标识：');
  let fixedCount = 0;

  for (const field of allFields) {
    const shouldBeSystem = SYSTEM_FIELDS.includes(field.fieldCode);

    if (shouldBeSystem && !field.isSystem) {
      console.log(`  - 修复字段: ${field.fieldCode} (ID: ${field.id})`);
      await prisma.employeeInfoTabField.update({
        where: { id: field.id },
        data: { isSystem: true },
      });
      fixedCount++;
    }
  }

  if (fixedCount === 0) {
    console.log('  所有系统内置字段的isSystem标识都正确\n');
  } else {
    console.log(`  已修复 ${fixedCount} 个字段的isSystem标识\n`);
  }

  // 5. 处理重复字段（只保留isSystem=true的记录，或保留最早创建的记录）
  console.log('处理重复字段：');
  let deletedCount = 0;

  for (const { code, fields } of duplicates) {
    // 如果有系统字段标识的，保留有系统标识的
    const systemFields = fields.filter((f) => f.isSystem);
    const nonSystemFields = fields.filter((f) => !f.isSystem);

    let toKeep: any;
    let toDelete: any[];

    if (systemFields.length > 0) {
      // 如果有系统字段，保留系统字段
      toKeep = systemFields[0];
      toDelete = [...systemFields.slice(1), ...nonSystemFields];
    } else {
      // 如果都没有系统字段标识，保留最早创建的
      toKeep = fields.sort((a, b) => a.id - b.id)[0];
      toDelete = fields.slice(1);
    }

    if (toDelete.length > 0) {
      console.log(`  - ${code}: 保留 ID ${toKeep.id}, 删除 ${toDelete.map((f) => f.id).join(', ')}`);

      // 删除重复记录
      for (const field of toDelete) {
        await prisma.employeeInfoTabField.delete({
          where: { id: field.id },
        });
        deletedCount++;
      }
    }
  }

  if (deletedCount === 0) {
    console.log('  没有需要删除的重复字段\n');
  } else {
    console.log(`  已删除 ${deletedCount} 条重复字段记录\n`);
  }

  // 6. 最终统计
  const finalFields = await prisma.employeeInfoTabField.findMany({
    select: {
      id: true,
      fieldCode: true,
      isSystem: true,
    },
  });

  const systemFieldCount = finalFields.filter((f) => f.isSystem).length;
  const customFieldCount = finalFields.filter((f) => !f.isSystem).length;

  console.log('修复完成！最终统计：');
  console.log(`  - 系统内置字段: ${systemFieldCount} 个`);
  console.log(`  - 自定义字段: ${customFieldCount} 个`);
  console.log(`  - 总计: ${finalFields.length} 个\n`);

  // 7. 显示所有系统内置字段
  console.log('系统内置字段列表：');
  const systemFieldsList = finalFields
    .filter((f) => f.isSystem)
    .sort((a, b) => a.fieldCode.localeCompare(b.fieldCode));

  for (const field of systemFieldsList) {
    console.log(`  - ${field.fieldCode} (ID: ${field.id})`);
  }
}

fixSystemFields()
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
