import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 字段映射：将孤立的字段移动到正确的页签和分组
const FIELD_MAPPINGS = [
  // tabId 14 的字段应该移到 tabId 5（基本信息）
  {
    orphanTabId: 14,
    targetTabId: 5,
    groupMappings: {
      10: 1,  // PERSONAL_INFO -> personal_info
      11: 4,  // CONTACT_INFO -> emergency_contact
      12: 1,  // PERSONAL_DETAILS -> personal_info
    }
  },
  // tabId 15 的字段应该移到 tabId 6（工作信息）
  {
    orphanTabId: 15,
    targetTabId: 6,
    groupMappings: {
      13: 5,  // CURRENT_POSITION -> position_info
      14: 6,  // EMPLOYMENT_INFO -> entry_info
      15: 5,  // ORG_INFO -> position_info
    }
  },
];

// 需要特殊处理的字段（字段代码映射）
const FIELD_CODE_MAPPINGS = {
  'employee_no': 'employeeNo',
  'id_card': 'idCard',
  'mobile': 'phone',
  'birth_date': 'birthDate',
  'hire_date': 'hireDate',
  'probation_start': 'probationStart',
  'probation_end': 'probationEnd',
  'probation_months': 'probationMonths',
  'regular_date': 'regularDate',
  'work_years': 'workYears',
  'work_location': 'workLocation',
  'work_address': 'workAddress',
  'org_id': 'orgId',
  'household_register': 'householdRegister',
  'current_address': 'currentAddress',
  'emergency_contact': 'emergencyContact',
  'emergency_phone': 'emergencyPhone',
  'emergency_relation': 'emergencyRelation',
};

async function fixOrphanedFields() {
  console.log('开始修复孤立字段...\n');

  // 1. 查找所有在不存在页签中的字段
  const existingTabs = await prisma.employeeInfoTab.findMany({
    select: { id: true },
  });
  const existingTabIds = new Set(existingTabs.map(t => t.id));

  const orphanedFields = await prisma.employeeInfoTabField.findMany({
    where: {
      tabId: { notIn: Array.from(existingTabIds) },
    },
  });

  console.log(`发现 ${orphanedFields.length} 个孤立字段：`);
  orphanedFields.forEach(f => {
    console.log(`  - ${f.fieldCode} (ID: ${f.id}, tabId: ${f.tabId}, groupId: ${f.groupId})`);
  });
  console.log();

  // 2. 处理孤立字段
  let movedCount = 0;
  let deletedCount = 0;

  for (const field of orphanedFields) {
    // 查找映射配置
    const mapping = FIELD_MAPPINGS.find(m => m.orphanTabId === field.tabId);

    if (!mapping) {
      console.log(`  ⚠️  字段 ${field.fieldCode} (tabId: ${field.tabId}) 没有映射配置，跳过`);
      continue;
    }

    const targetGroupId = mapping.groupMappings[field.groupId || 0];

    if (!targetGroupId) {
      console.log(`  ⚠️  字段 ${field.fieldCode} (groupId: ${field.groupId}) 没有分组映射配置，跳过`);
      continue;
    }

    // 检查目标分组中是否已存在相同字段代码的字段
    const existingField = await prisma.employeeInfoTabField.findFirst({
      where: {
        tabId: mapping.targetTabId,
        groupId: targetGroupId,
        OR: [
          { fieldCode: field.fieldCode },
          // 也检查字段代码的旧版本
          ...(Object.entries(FIELD_CODE_MAPPINGS)
            .filter(([_, newCode]) => newCode === field.fieldCode)
            .map(([oldCode, _]) => ({ fieldCode: oldCode }))
          )
        ]
      },
    });

    if (existingField) {
      console.log(`  🗑️  删除重复字段 ${field.fieldCode} (ID: ${field.id})，目标已有字段 ID: ${existingField.id}`);
      await prisma.employeeInfoTabField.delete({
        where: { id: field.id },
      });
      deletedCount++;
    } else {
      console.log(`  ✅ 移动字段 ${field.fieldCode} (ID: ${field.id}) -> tabId: ${mapping.targetTabId}, groupId: ${targetGroupId}`);
      await prisma.employeeInfoTabField.update({
        where: { id: field.id },
        data: {
          tabId: mapping.targetTabId,
          groupId: targetGroupId,
        },
      });
      movedCount++;
    }
  }

  console.log(`\n完成！移动了 ${movedCount} 个字段，删除了 ${deletedCount} 个重复字段`);

  // 3. 删除不存在的页签的分组
  const orphanedGroups = await prisma.employeeInfoTabGroup.findMany({
    where: {
      tabId: { notIn: Array.from(existingTabIds) },
    },
  });

  console.log(`\n发现 ${orphanedGroups.length} 个孤立分组：`);
  for (const group of orphanedGroups) {
    console.log(`  🗑️  删除分组 ${group.code} (ID: ${group.id}, tabId: ${group.tabId})`);
    await prisma.employeeInfoTabGroup.delete({
      where: { id: group.id },
    });
  }

  // 4. 验证修复结果
  console.log('\n验证修复结果：');

  const entryDateField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'entryDate' },
    include: {
      tab: { select: { code: true, name: true } },
      group: { select: { code: true, name: true } },
    },
  });

  if (entryDateField) {
    console.log(`\n✅ entryDate 字段：`);
    console.log(`   - 页签: ${entryDateField.tab?.name} (${entryDateField.tab?.code})`);
    console.log(`   - 分组: ${entryDateField.group?.name} (${entryDateField.group?.code})`);
    console.log(`   - isSystem: ${entryDateField.isSystem}`);
  } else {
    console.log(`\n❌ 未找到 entryDate 字段`);
  }

  // 统计各页签字段数量
  const stats = await prisma.employeeInfoTabField.groupBy({
    by: ['tabId'],
    _count: { id: true },
  });

  console.log('\n各页签字段统计：');
  for (const stat of stats) {
    const tab = await prisma.employeeInfoTab.findUnique({
      where: { id: stat.tabId },
      select: { name: true },
    });
    console.log(`  - ${tab?.name || 'Unknown'}: ${stat._count.id} 个字段`);
  }
}

fixOrphanedFields()
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
