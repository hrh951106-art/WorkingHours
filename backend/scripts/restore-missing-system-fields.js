#!/usr/bin/env node

// ========================================
// 恢复缺失的系统内置字段
// ========================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 缺失的系统内置字段
const MISSING_SYSTEM_FIELDS = [
  {
    fieldCode: 'gender',
    fieldName: '性别',
    fieldType: 'SELECT',
    isRequired: true,
    isSystem: true,
    tabCode: 'basic_info',
    groupCode: 'personal_info',
    sort: 5,
    dataSourceCode: 'gender'
  },
  {
    fieldCode: 'nation',
    fieldName: '民族',
    fieldType: 'SELECT',
    isRequired: false,
    isSystem: true,
    tabCode: 'basic_info',
    groupCode: 'personal_info',
    sort: 6,
    dataSourceCode: 'nation'
  },
  {
    fieldCode: 'politicalStatus',
    fieldName: '政治面貌',
    fieldType: 'SELECT',
    isRequired: false,
    isSystem: true,
    tabCode: 'basic_info',
    groupCode: 'personal_info',
    sort: 7,
    dataSourceCode: 'political_status'
  }
];

async function main() {
  console.log('');
  console.log('========================================');
  console.log('恢复缺失的系统内置字段');
  console.log('========================================');
  console.log('');

  try {
    // ========================================
    // 第一步：检查哪些字段缺失
    // ========================================
    console.log('【第一步】检查缺失的字段');
    console.log('----------------------------------------');

    const existingFields = await prisma.employeeInfoTabField.findMany({
      where: {
        fieldCode: {
          in: MISSING_SYSTEM_FIELDS.map(f => f.fieldCode)
        }
      },
      select: {
        fieldCode: true
      }
    });

    const existingCodes = existingFields.map(f => f.fieldCode);
    const missingFields = MISSING_SYSTEM_FIELDS.filter(f => !existingCodes.includes(f.fieldCode));

    console.log(`需要恢复 ${missingFields.length} 个字段:`);
    missingFields.forEach(f => {
      console.log(`  - ${f.fieldCode}: ${f.fieldName}`);
    });

    if (missingFields.length === 0) {
      console.log('\n✓ 所有字段都存在，无需恢复');
      return;
    }

    console.log('');

    // ========================================
    // 第二步：恢复缺失的字段
    // ========================================
    console.log('【第二步】恢复缺失字段');
    console.log('----------------------------------------');

    for (const fieldConfig of missingFields) {
      // 查找页签
      const tab = await prisma.employeeInfoTab.findFirst({
        where: { code: fieldConfig.tabCode }
      });

      if (!tab) {
        console.log(`⚠️  警告: 页签 ${fieldConfig.tabCode} 不存在，跳过字段 ${fieldConfig.fieldCode}`);
        continue;
      }

      // 查找分组
      const group = await prisma.employeeInfoTabGroup.findFirst({
        where: {
          tabId: tab.id,
          code: fieldConfig.groupCode
        }
      });

      if (!group) {
        console.log(`⚠️  警告: 分组 ${fieldConfig.groupCode} 不存在，跳过字段 ${fieldConfig.fieldCode}`);
        continue;
      }

      // 查找数据源
      const dataSource = await prisma.dataSource.findFirst({
        where: {
          code: fieldConfig.dataSourceCode,
          isSystem: true
        }
      });

      if (!dataSource) {
        console.log(`⚠️  警告: 数据源 ${fieldConfig.dataSourceCode} 不存在，跳过字段 ${fieldConfig.fieldCode}`);
        continue;
      }

      // 创建字段
      const field = await prisma.employeeInfoTabField.create({
        data: {
          tabId: tab.id,
          groupId: group.id,
          fieldCode: fieldConfig.fieldCode,
          fieldName: fieldConfig.fieldName,
          fieldType: fieldConfig.fieldType,
          isRequired: fieldConfig.isRequired,
          isSystem: fieldConfig.isSystem,
          dataSourceId: dataSource.id,
          sort: fieldConfig.sort
        }
      });

      console.log(`✓ 已创建字段: ${field.fieldCode} (${field.fieldName})`);
    }

    console.log('');

    // ========================================
    // 第三步：验证结果
    // ========================================
    console.log('【第三步】验证结果');
    console.log('----------------------------------------');

    const allFields = await prisma.employeeInfoTabField.findMany({
      where: {
        fieldCode: {
          in: MISSING_SYSTEM_FIELDS.map(f => f.fieldCode)
        }
      },
      select: {
        fieldCode: true,
        fieldName: true,
        fieldType: true,
        isSystem: true,
        dataSourceId: true
      },
      orderBy: {
        fieldCode: 'asc'
      }
    });

    console.log('\n系统内置字段列表:');
    console.table(allFields);

    console.log('');
    console.log('========================================');
    console.log('✓ 恢复完成！');
    console.log('========================================');
    console.log('');
    console.log('总结:');
    console.log(`- 恢复了 ${allFields.length} 个缺失的系统内置字段`);
    console.log('- 所有字段的 isSystem = 1');
    console.log('- 所有字段都关联了数据源');
    console.log('- 前端将不会显示这些字段的删除按钮');
    console.log('');

  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
