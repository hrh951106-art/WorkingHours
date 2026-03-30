/**
 * 迁移脚本：将工作信息的自定义字段从 Employee.customFields 迁移到 WorkInfoHistory.customFields
 *
 * 这个脚本会：
 * 1. 查询所有员工
 * 2. 获取 WORK_INFO 页签的配置，确定哪些自定义字段属于工作信息
 * 3. 将这些字段从 Employee.customFields 移动到 WorkInfoHistory.customFields
 * 4. 保留其他自定义字段在 Employee.customFields 中
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateWorkInfoCustomFields() {
  console.log('开始迁移工作信息自定义字段...');

  try {
    // 1. 获取 WORK_INFO 页签的配置
    const workInfoTab = await prisma.employeeInfoTab.findUnique({
      where: { code: 'work_info' },
      include: {
        groups: {
          where: { status: 'ACTIVE' },
          include: {
            fields: {
              where: {
                fieldType: 'CUSTOM',
              },
            },
          },
        },
      },
    });

    if (!workInfoTab) {
      console.log('未找到 WORK_INFO 页签配置');
      return;
    }

    // 收集所有工作信息自定义字段代码
    const workInfoCustomFieldCodes = new Set<string>();
    if (workInfoTab.groups) {
      for (const group of workInfoTab.groups) {
        for (const field of group.fields) {
          workInfoCustomFieldCodes.add(field.fieldCode);
        }
      }
    }

    console.log(`找到 ${workInfoCustomFieldCodes.size} 个工作信息自定义字段:`, Array.from(workInfoCustomFieldCodes));

    if (workInfoCustomFieldCodes.size === 0) {
      console.log('工作信息页签没有自定义字段，无需迁移');
      return;
    }

    // 2. 获取所有员工及其当前工作信息
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        workInfoHistory: {
          where: { isCurrent: true },
        },
      },
    });

    console.log(`找到 ${employees.length} 个在职员工`);

    let migratedCount = 0;
    let skippedCount = 0;

    // 3. 遍历每个员工，迁移自定义字段
    for (const employee of employees) {
      const currentWorkInfo = employee.workInfoHistory[0];

      if (!currentWorkInfo) {
        console.log(`员工 ${employee.employeeNo} (${employee.name}) 没有当前工作信息，跳过`);
        skippedCount++;
        continue;
      }

      // 解析员工的 customFields
      const employeeCustomFields = JSON.parse(employee.customFields || '{}');
      // 解析工作信息的 customFields
      const workInfoCustomFields = JSON.parse(currentWorkInfo.customFields || '{}');

      // 分离字段
      const newWorkInfoFields: any = {};
      const newEmployeeFields: any = {};
      let hasChanges = false;

      for (const [key, value] of Object.entries(employeeCustomFields)) {
        if (workInfoCustomFieldCodes.has(key)) {
          // 这个字段属于工作信息，应该移动到 WorkInfoHistory
          newWorkInfoFields[key] = value;
          hasChanges = true;
        } else {
          // 这个字段不属于工作信息，保留在 Employee
          newEmployeeFields[key] = value;
        }
      }

      if (!hasChanges) {
        console.log(`员工 ${employee.employeeNo} (${employee.name}) 没有需要迁移的工作信息自定义字段，跳过`);
        skippedCount++;
        continue;
      }

      // 更新 WorkInfoHistory.customFields（合并已有字段）
      const mergedWorkInfoFields = {
        ...workInfoCustomFields,
        ...newWorkInfoFields,
      };

      await prisma.workInfoHistory.update({
        where: { id: currentWorkInfo.id },
        data: {
          customFields: JSON.stringify(mergedWorkInfoFields),
        },
      });

      // 更新 Employee.customFields（移除已迁移的字段）
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          customFields: JSON.stringify(newEmployeeFields),
        },
      });

      console.log(`✓ 员工 ${employee.employeeNo} (${employee.name}) 迁移完成:`);
      console.log(`  移动字段: ${Object.keys(newWorkInfoFields).join(', ')}`);
      migratedCount++;
    }

    console.log('\n迁移完成!');
    console.log(`成功迁移: ${migratedCount} 个员工`);
    console.log(`跳过: ${skippedCount} 个员工`);

  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行迁移
migrateWorkInfoCustomFields()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
