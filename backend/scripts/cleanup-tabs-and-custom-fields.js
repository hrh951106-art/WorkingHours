#!/usr/bin/env node

// ========================================
// 清理重复页签和自定义字段中的系统内置字段
// ========================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('');
  console.log('========================================');
  console.log('清理重复页签和自定义字段');
  console.log('========================================');
  console.log('');

  try {
    // ========================================
    // 第一步：删除大写代码的重复页签
    // ========================================
    console.log('【第一步】删除重复页签（大写代码）');
    console.log('----------------------------------------');

    const duplicateTabs = await prisma.employeeInfoTab.findMany({
      where: {
        code: {
          in: ['BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY_INFO']
        }
      }
    });

    console.log(`找到 ${duplicateTabs.length} 个重复页签`);

    if (duplicateTabs.length > 0) {
      // 先删除这些页签的字段和分组
      for (const tab of duplicateTabs) {
        await prisma.employeeInfoTabField.deleteMany({
          where: { tabId: tab.id }
        });
        await prisma.employeeInfoTabGroup.deleteMany({
          where: { tabId: tab.id }
        });
      }

      // 删除页签
      await prisma.employeeInfoTab.deleteMany({
        where: {
          code: {
            in: ['BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY_INFO']
          }
        }
      });

      console.log('✓ 已删除重复页签');
    } else {
      console.log('✓ 没有发现重复页签');
    }

    console.log('');

    // ========================================
    // 第二步：检查CustomField中的系统内置字段
    // ========================================
    console.log('【第二步】检查CustomField中的系统内置字段');
    console.log('----------------------------------------');

    const systemFieldCodes = [
      'gender', 'nation', 'maritalStatus', 'politicalStatus',
      'educationLevel', 'educationType', 'employeeType', 'position',
      'rank', 'workStatus', 'employmentStatus', 'resignationReason',
      'familyRelation'
    ];

    const systemCustomFields = await prisma.customField.findMany({
      where: {
        code: {
          in: systemFieldCodes
        }
      }
    });

    if (systemCustomFields.length > 0) {
      console.log(`发现 ${systemCustomFields.length} 个系统内置字段的CustomField记录`);
      console.log('这些字段应该直接在EmployeeInfoTabField中管理，不应在CustomField中');

      console.log('\n将删除以下记录:');
      systemCustomFields.forEach(field => {
        console.log(`  - ${field.code}: ${field.name}`);
      });

      // 删除这些记录
      await prisma.customField.deleteMany({
        where: {
          code: {
            in: systemFieldCodes
          }
        }
      });

      console.log('\n✓ 已删除系统内置字段的CustomField记录');
    } else {
      console.log('✓ CustomField中没有系统内置字段');
    }

    console.log('');

    // ========================================
    // 第三步：验证结果
    // ========================================
    console.log('【第三步】验证结果');
    console.log('----------------------------------------');

    console.log('3.1 检查页签:');
    const tabs = await prisma.employeeInfoTab.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        status: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.table(tabs);

    console.log('');
    console.log('3.2 检查CustomField（应该只包含自定义字段）:');
    const customFields = await prisma.customField.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isSystem: true
      },
      orderBy: {
        sort: 'asc'
      }
    });

    if (customFields.length > 0) {
      console.table(customFields);
    } else {
      console.log('✓ CustomField 为空（这是正常的）');
    }

    console.log('');
    console.log('3.3 检查EmployeeInfoTabField中的系统内置字段:');
    const systemFields = await prisma.employeeInfoTabField.findMany({
      where: {
        isSystem: true
      },
      select: {
        id: true,
        fieldCode: true,
        fieldName: true,
        isSystem: true,
        dataSourceId: true
      },
      orderBy: {
        fieldCode: 'asc'
      }
    });

    console.table(systemFields);

    console.log('');
    console.log('========================================');
    console.log('✓ 清理完成！');
    console.log('========================================');
    console.log('');
    console.log('完成的操作:');
    console.log('1. 删除了大写代码的重复页签');
    console.log('2. 删除了CustomField中的系统内置字段记录');
    console.log('3. 保留了小写代码的系统页签');
    console.log('4. 系统内置字段只在EmployeeInfoTabField中管理');
    console.log('');

  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
