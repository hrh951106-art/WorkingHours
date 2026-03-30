import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCustomFields() {
  console.log('🔧 开始迁移 customFields 数据到表列...\n');

  // 1. 迁移 Employee 表数据
  console.log('=== 迁移 Employee 表数据 ===');
  const employees = await prisma.employee.findMany();
  console.log(`找到 ${employees.length} 个员工记录\n`);

  for (const employee of employees) {
    if (!employee.customFields || employee.customFields === '{}') {
      console.log(`员工 ${employee.employeeNo}: 无需迁移`);
      continue;
    }

    let customFields: any = {};
    try {
      customFields = JSON.parse(employee.customFields);
    } catch (e) {
      console.error(`员工 ${employee.employeeNo}: customFields 解析失败`);
      continue;
    }

    // 定义已提取为表列的字段（需要从 customFields 中移除）
    const extractedFields = [
      'birthDate', 'age', 'maritalStatus', 'nativePlace', 'politicalStatus',
      'householdRegister', 'currentAddress', 'photo', 'emergencyContact',
      'emergencyPhone', 'emergencyRelation', 'homeAddress', 'homePhone',
      'idCard', 'phone', 'email', 'gender', 'name', 'employeeNo', 'orgId',
      'entryDate', 'status'
    ];

    // 构建 updateData
    const updateData: any = {};
    const remainingCustomFields: any = {};

    Object.keys(customFields).forEach(key => {
      if (extractedFields.includes(key)) {
        // 这个字段已经是表列，迁移到对应列
        let value = customFields[key];

        // 处理日期字段
        if (key === 'birthDate' || key === 'entryDate') {
          if (typeof value === 'string') {
            // 格式 YYYY-MM-DD 转 Date
            value = new Date(value);
          }
        }

        updateData[key] = value;
      } else {
        // 这是真正的自定义字段，保留在 customFields 中
        remainingCustomFields[key] = customFields[key];
      }
    });

    // 更新数据库
    if (Object.keys(updateData).length > 0) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          ...updateData,
          customFields: JSON.stringify(remainingCustomFields),
        },
      });
      console.log(`✅ 员工 ${employee.employeeNo}: 迁移了 ${Object.keys(updateData).length} 个字段到表列`);
      console.log(`   迁移的字段: ${Object.keys(updateData).join(', ')}`);
      console.log(`   保留的自定义字段: ${Object.keys(remainingCustomFields).join(', ') || '无'}\n`);
    }
  }

  // 2. 迁移 WorkInfoHistory 表数据
  console.log('\n=== 迁移 WorkInfoHistory 表数据 ===');
  const workInfoHistory = await prisma.workInfoHistory.findMany();
  console.log(`找到 ${workInfoHistory.length} 条工作信息记录\n`);

  for (const workInfo of workInfoHistory) {
    if (!workInfo.customFields || workInfo.customFields === '{}') {
      console.log(`WorkInfoHistory ID ${workInfo.id}: 无需迁移`);
      continue;
    }

    let customFields: any = {};
    try {
      customFields = JSON.parse(workInfo.customFields);
    } catch (e) {
      console.error(`WorkInfoHistory ID ${workInfo.id}: customFields 解析失败`);
      continue;
    }

    // 定义已提取为表列的字段（需要从 customFields 中移除）
    const extractedFields = [
      'position', 'jobLevel', 'employeeType', 'deptId', 'workLocation', 'workAddress',
      'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
      'regularDate', 'resignationDate', 'resignationReason', 'workYears',
      'orgId', 'effectiveDate', 'endDate', 'isCurrent', 'reason'
    ];

    // 构建 updateData
    const updateData: any = {};
    const remainingCustomFields: any = {};

    Object.keys(customFields).forEach(key => {
      if (extractedFields.includes(key)) {
        // 这个字段已经是表列，迁移到对应列
        let value = customFields[key];

        // 处理日期字段
        if (key.includes('Date') || key.includes('Start') || key.includes('End')) {
          if (typeof value === 'string') {
            // 格式 YYYY-MM-DD 转 Date
            value = new Date(value);
          }
        }

        updateData[key] = value;
      } else {
        // 这是真正的自定义字段，保留在 customFields 中
        remainingCustomFields[key] = customFields[key];
      }
    });

    // 更新数据库
    if (Object.keys(updateData).length > 0) {
      await prisma.workInfoHistory.update({
        where: { id: workInfo.id },
        data: {
          ...updateData,
          customFields: JSON.stringify(remainingCustomFields),
        },
      });
      console.log(`✅ WorkInfoHistory ID ${workInfo.id}: 迁移了 ${Object.keys(updateData).length} 个字段到表列`);
      console.log(`   迁移的字段: ${Object.keys(updateData).join(', ')}`);
      console.log(`   保留的自定义字段: ${Object.keys(remainingCustomFields).join(', ') || '无'}\n`);
    }
  }

  // 3. 验证迁移结果
  console.log('\n=== 验证迁移结果 ===');

  const updatedEmployees = await prisma.employee.findMany({
    where: {
      OR: [
        { birthDate: { not: null } },
        { maritalStatus: { not: null } },
        { emergencyContact: { not: null } },
      ],
    },
  });

  console.log(`Employee 表中有 ${updatedEmployees.length} 条记录的列字段已填充`);

  updatedEmployees.forEach(emp => {
    const cf = JSON.parse(emp.customFields || '{}');
    console.log(`  - ${emp.employeeNo}: birthDate=${emp.birthDate?.toISOString().split('T')[0]}, maritalStatus=${emp.maritalStatus}, customFields=${JSON.stringify(Object.keys(cf))}`);
  });

  await prisma.$disconnect();
}

migrateCustomFields()
  .then(() => {
    console.log('\n✅ 迁移完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  });
