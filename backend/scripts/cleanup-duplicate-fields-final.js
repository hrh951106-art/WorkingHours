#!/usr/bin/env node

// ========================================
// 清理 EmployeeInfoTabField 中的所有重复记录
// ========================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始清理 EmployeeInfoTabField 重复记录...');

  // 查询所有需要处理的字段
  const allFields = await prisma.employeeInfoTabField.findMany({
    where: {
      fieldCode: {
        in: ['gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType', 'position', 'rank', 'employmentStatus']
      }
    },
    orderBy: [{ fieldCode: 'asc' }, { id: 'asc' }]
  });

  // 按字段分组，只保留第一条记录
  const fieldsToDelete = [];
  const processedCodes = new Set();

  for (const field of allFields) {
    if (processedCodes.has(field.fieldCode)) {
      // 已经处理过这个字段，删除重复记录
      fieldsToDelete.push(field.id);
    } else {
      // 第一次遇到这个字段，保留
      processedCodes.add(field.fieldCode);
    }
  }

  console.log(`找到 ${fieldsToDelete.length} 条重复记录需要删除`);

  if (fieldsToDelete.length > 0) {
    await prisma.employeeInfoTabField.deleteMany({
      where: {
        id: { in: fieldsToDelete }
      }
    });

    console.log(`✓ 已删除 ${fieldsToDelete.length} 条重复记录`);
  }

  // 验证结果
  const remainingFields = await prisma.employeeInfoTabField.findMany({
    where: {
      fieldCode: {
        in: ['gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType', 'position', 'rank', 'employmentStatus']
      }
    },
    orderBy: [{ fieldCode: 'asc' }]
  });

  console.log('\n验证结果：');
  console.table(remainingFields.map(f => ({
    fieldCode: f.fieldCode,
    fieldName: f.fieldName,
    fieldType: f.fieldType
  })));

  await prisma.$disconnect();
  console.log('\n✓ 清理完成！');
}

main().catch(console.error);
