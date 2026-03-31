import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Employee 表中的系统字段列表
const EMPLOYEE_SYSTEM_FIELDS = [
  'employeeNo',
  'name',
  'gender',
  'idCard',
  'phone',
  'email',
  'orgId',
  'entryDate',
  'status',
  'birthDate',
  'age',
  'maritalStatus',
  'nativePlace',
  'politicalStatus',
  'householdRegister',
  'currentAddress',
  'photo',
  'emergencyContact',
  'emergencyPhone',
  'emergencyRelation',
  'homeAddress',
  'homePhone',
];

async function fixEmergencyFields() {
  console.log('开始修复紧急联系人和籍贯字段...\n');

  // 1. 查找所有重复的系统字段（下划线和驼峰命名并存的情况）
  const duplicateFields = await prisma.employeeInfoTabField.findMany({
    where: {
      fieldCode: {
        in: ['nativePlace', 'currentAddress'],
      },
    },
    orderBy: { id: 'asc' },
  });

  console.log('发现可能重复的字段：');
  for (const field of duplicateFields) {
    console.log(`  - ${field.fieldCode} (ID: ${field.id}, fieldType: ${field.fieldType}, isSystem: ${field.isSystem}, groupId: ${field.groupId})`);
  }
  console.log();

  // 2. 处理 nativePlace 重复字段
  const nativePlaceFields = await prisma.employeeInfoTabField.findMany({
    where: { fieldCode: { in: ['nativePlace', 'native_place'] } },
  });

  console.log('处理 nativePlace 字段：');
  if (nativePlaceFields.length >= 2) {
    // 保留 fieldType = SYSTEM 的记录
    const systemField = nativePlaceFields.find(f => f.fieldType === 'SYSTEM');
    const nonSystemFields = nativePlaceFields.filter(f => f.fieldType !== 'SYSTEM');

    if (systemField && nonSystemFields.length > 0) {
      for (const field of nonSystemFields) {
        console.log(`  🗑️  删除重复字段 ${field.fieldCode} (ID: ${field.id})，保留系统字段 ID: ${systemField.id}`);
        await prisma.employeeInfoTabField.delete({ where: { id: field.id } });
      }
    } else if (!systemField) {
      // 如果没有 SYSTEM 类型，将第一个转换为 SYSTEM
      const fieldToFix = nativePlaceFields[0];
      console.log(`  ✅ 修复字段 ${fieldToFix.fieldCode} (ID: ${fieldToFix.id}): fieldType -> SYSTEM, isSystem -> true`);
      await prisma.employeeInfoTabField.update({
        where: { id: fieldToFix.id },
        data: { fieldType: 'SYSTEM', isSystem: true },
      });
      // 删除其他重复字段
      for (const field of nativePlaceFields.slice(1)) {
        console.log(`  🗑️  删除重复字段 ${field.fieldCode} (ID: ${field.id})`);
        await prisma.employeeInfoTabField.delete({ where: { id: field.id } });
      }
    }
  }
  console.log();

  // 3. 处理 currentAddress 重复字段
  const currentAddressFields = await prisma.employeeInfoTabField.findMany({
    where: { fieldCode: { in: ['currentAddress', 'current_address'] } },
  });

  console.log('处理 currentAddress 字段：');
  if (currentAddressFields.length >= 2) {
    // 保留 fieldType = SYSTEM 的记录
    const systemField = currentAddressFields.find(f => f.fieldType === 'SYSTEM');
    const nonSystemFields = currentAddressFields.filter(f => f.fieldType !== 'SYSTEM');

    if (systemField && nonSystemFields.length > 0) {
      for (const field of nonSystemFields) {
        console.log(`  🗑️  删除重复字段 ${field.fieldCode} (ID: ${field.id})，保留系统字段 ID: ${systemField.id}`);
        await prisma.employeeInfoTabField.delete({ where: { id: field.id } });
      }
    } else if (!systemField) {
      // 如果没有 SYSTEM 类型，将第一个转换为 SYSTEM
      const fieldToFix = currentAddressFields[0];
      console.log(`  ✅ 修复字段 ${fieldToFix.fieldCode} (ID: ${fieldToFix.id}): fieldType -> SYSTEM, isSystem -> true`);
      await prisma.employeeInfoTabField.update({
        where: { id: fieldToFix.id },
        data: { fieldType: 'SYSTEM', isSystem: true },
      });
      // 删除其他重复字段
      for (const field of currentAddressFields.slice(1)) {
        console.log(`  🗑️  删除重复字段 ${field.fieldCode} (ID: ${field.id})`);
        await prisma.employeeInfoTabField.delete({ where: { id: field.id } });
      }
    }
  }
  console.log();

  // 4. 检查 emergency_contact 分组，确保 currentAddress 在正确的位置
  const emergencyGroupFields = await prisma.employeeInfoTabField.findMany({
    where: { groupId: 4 },
    orderBy: { sort: 'asc' },
  });

  console.log('emergency_contact 分组字段（修复后）：');
  for (const field of emergencyGroupFields) {
    console.log(`  - ${field.fieldCode} (ID: ${field.id}, sort: ${field.sort}, isHidden: ${field.isHidden})`);
  }
  console.log();

  // 5. 确保 phone 字段不在 emergency_contact 分组
  const phoneInEmergency = await prisma.employeeInfoTabField.findFirst({
    where: {
      groupId: 4,
      fieldCode: 'phone',
    },
  });

  if (phoneInEmergency) {
    console.log(`⚠️  phone 字段 (ID: ${phoneInEmergency.id}) 在 emergency_contact 分组中，应该移除`);
    // 这里只是提示，不自动处理，因为可能需要根据实际业务需求决定
  }

  // 6. 验证修复结果
  console.log('验证修复结果：');

  const nativePlace = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: { in: ['nativePlace', 'native_place'] } },
  });

  if (nativePlace) {
    console.log(`\n✅ nativePlace 字段：`);
    console.log(`   - ID: ${nativePlace.id}`);
    console.log(`   - fieldCode: ${nativePlace.fieldCode}`);
    console.log(`   - fieldType: ${nativePlace.fieldType}`);
    console.log(`   - isSystem: ${nativePlace.isSystem}`);
  } else {
    console.log(`\n❌ 未找到 nativePlace 字段`);
  }

  const currentAddress = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: { in: ['currentAddress', 'current_address'] } },
  });

  if (currentAddress) {
    console.log(`\n✅ currentAddress 字段：`);
    console.log(`   - ID: ${currentAddress.id}`);
    console.log(`   - fieldCode: ${currentAddress.fieldCode}`);
    console.log(`   - fieldType: ${currentAddress.fieldType}`);
    console.log(`   - isSystem: ${currentAddress.isSystem}`);
    console.log(`   - groupId: ${currentAddress.groupId}`);
    console.log(`   - isHidden: ${currentAddress.isHidden}`);
  } else {
    console.log(`\n❌ 未找到 currentAddress 字段`);
  }

  // 统计 emergency_contact 分组的字段数量
  const emergencyCount = await prisma.employeeInfoTabField.count({
    where: { groupId: 4, isHidden: false },
  });

  console.log(`\n📊 emergency_contact 分组可见字段数量: ${emergencyCount}`);
}

fixEmergencyFields()
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
