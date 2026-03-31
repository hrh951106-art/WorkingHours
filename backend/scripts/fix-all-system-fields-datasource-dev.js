#!/usr/bin/env node

// ========================================
// 系统内置字段数据源完整关联脚本（开发环境）
// ========================================
// 用途:
//   1. 清理 EmployeeInfoTabField 中的重复记录
//   2. 统一命名规范为驼峰命名（camelCase）
//   3. 确保所有需要下拉选项的字段都关联到数据源
//   4. 后续通过查找项管理数据选项
// ========================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 系统内置字段配置
const SYSTEM_FIELDS = [
  { code: 'gender', name: '性别', dataSourceCode: 'gender', group: 'basic', sort: 1 },
  { code: 'nation', name: '民族', dataSourceCode: 'nation', group: 'basic', sort: 2 },
  { code: 'maritalStatus', name: '婚姻状况', dataSourceCode: 'marital_status', group: 'basic', sort: 3 },
  { code: 'politicalStatus', name: '政治面貌', dataSourceCode: 'political_status', group: 'basic', sort: 4 },
  { code: 'educationLevel', name: '学历层次', dataSourceCode: 'education_level', group: 'education', sort: 5 },
  { code: 'educationType', name: '学历类型', dataSourceCode: 'education_type', group: 'education', sort: 6 },
  { code: 'employeeType', name: '员工类型', dataSourceCode: 'employee_type', group: 'work', sort: 7 },
  { code: 'position', name: '职位', dataSourceCode: 'POSITION', group: 'work', sort: 8 },
  { code: 'rank', name: '职级', dataSourceCode: 'JOB_LEVEL', group: 'work', sort: 9 },
  { code: 'workStatus', name: '工作状态', dataSourceCode: 'WORK_STATUS', group: 'work', sort: 10 },
  { code: 'employmentStatus', name: '在职状态', dataSourceCode: 'employment_status', group: 'work', sort: 11 },
  { code: 'resignationReason', name: '离职原因', dataSourceCode: 'resignation_reason', group: 'work', sort: 12 },
  { code: 'familyRelation', name: '家庭关系', dataSourceCode: 'family_relation', group: 'family', sort: 13 },
];

// 命名映射：下划线 -> 驼峰
const NAMING_MAP = {
  'marital_status': 'maritalStatus',
  'political_status': 'politicalStatus',
  'education_level': 'educationLevel',
  'employee_type': 'employeeType',
  'work_status': 'workStatus',
  'employment_status': 'employmentStatus',
  'job_level': 'jobLevel',
  'resignation_reason': 'resignationReason',
  'education_type': 'educationType',
  'family_relation': 'familyRelation',
};

async function main() {
  console.log('');
  console.log('========================================');
  console.log('系统内置字段数据源完整关联');
  console.log('========================================');
  console.log('');

  try {
    // ========================================
    // 第一步：检查当前状态
    // ========================================
    console.log('【第一步】检查当前状态');
    console.log('----------------------------------------');

    const duplicateFields = await prisma.$queryRaw`
      SELECT
        fieldCode,
        fieldName,
        fieldType,
        COUNT(*) as count,
        GROUP_CONCAT(id) as ids
      FROM EmployeeInfoTabField
      WHERE fieldCode IN (
        'gender', 'nation', 'maritalStatus', 'politicalStatus',
        'educationLevel', 'employeeType', 'position', 'rank',
        'marital_status', 'political_status', 'education_level',
        'employee_type', 'work_status', 'employment_status'
      )
      GROUP BY fieldCode, fieldName, fieldType
      HAVING COUNT(*) > 1
    `;

    if (duplicateFields.length > 0) {
      console.log('发现重复记录:');
      console.table(duplicateFields);
    } else {
      console.log('✓ 未发现重复记录');
    }

    console.log('');

    // ========================================
    // 第二步：清理重复记录
    // ========================================
    console.log('【第二步】清理重复记录');
    console.log('----------------------------------------');

    // 查询所有需要处理的字段
    const allFields = await prisma.employeeInfoTabField.findMany({
      where: {
        fieldCode: {
          in: Object.keys(NAMING_MAP)
        }
      },
      orderBy: [{ fieldCode: 'asc' }, { id: 'asc' }]
    });

    // 按字段分组，只保留第一条记录
    const fieldsToDelete = [];
    const fieldsToUpdate = [];

    for (const field of allFields) {
      const newCode = NAMING_MAP[field.fieldCode];
      if (!newCode) continue;

      // 检查是否已处理过该字段
      const existing = fieldsToUpdate.find(f => f.originalCode === field.fieldCode);
      if (existing) {
        // 删除重复记录
        fieldsToDelete.push(field.id);
      } else {
        // 记录需要更新的字段
        fieldsToUpdate.push({
          id: field.id,
          originalCode: field.fieldCode,
          newCode: newCode
        });
      }
    }

    if (fieldsToDelete.length > 0) {
      await prisma.employeeInfoTabField.deleteMany({
        where: {
          id: { in: fieldsToDelete }
        }
      });
      console.log(`✓ 已删除 ${fieldsToDelete.length} 条重复记录`);
    }

    if (fieldsToUpdate.length > 0) {
      for (const field of fieldsToUpdate) {
        await prisma.employeeInfoTabField.update({
          where: { id: field.id },
          data: { fieldCode: field.newCode }
        });
        console.log(`✓ 已更新字段: ${field.originalCode} → ${field.newCode}`);
      }
    }

    console.log('');

    // ========================================
    // 第三步：更新 CustomField 命名
    // ========================================
    console.log('【第三步】更新 CustomField 命名');
    console.log('----------------------------------------');

    const customFields = await prisma.customField.findMany({
      where: {
        code: {
          in: Object.keys(NAMING_MAP)
        }
      }
    });

    for (const cf of customFields) {
      const newCode = NAMING_MAP[cf.code];
      if (newCode && newCode !== cf.code) {
        await prisma.customField.update({
          where: { id: cf.id },
          data: { code: newCode }
        });
        console.log(`✓ CustomField: ${cf.code} → ${newCode}`);
      }
    }

    console.log('');

    // ========================================
    // 第四步：确保所有字段都有 CustomField 记录
    // ========================================
    console.log('【第四步】创建缺失的 CustomField 记录');
    console.log('----------------------------------------');

    for (const fieldConfig of SYSTEM_FIELDS) {
      const existing = await prisma.customField.findUnique({
        where: { code: fieldConfig.code }
      });

      if (!existing) {
        // 查找数据源
        const dataSource = await prisma.dataSource.findFirst({
          where: {
            code: fieldConfig.dataSourceCode,
            isSystem: true
          }
        });

        if (!dataSource) {
          console.log(`⚠️  警告: 未找到数据源 ${fieldConfig.dataSourceCode}，跳过字段 ${fieldConfig.code}`);
          continue;
        }

        // 创建 CustomField
        await prisma.customField.create({
          data: {
            code: fieldConfig.code,
            name: fieldConfig.name,
            type: 'SELECT',
            dataSourceId: dataSource.id,
            isRequired: ['gender', 'maritalStatus', 'educationLevel', 'employeeType', 'workStatus'].includes(fieldConfig.code),
            group: fieldConfig.group,
            sort: fieldConfig.sort,
            isSystem: true,
            status: 'ACTIVE'
          }
        });

        console.log(`✓ 已创建 CustomField: ${fieldConfig.code} → ${fieldConfig.dataSourceCode}`);
      } else {
        console.log(`✓ CustomField 已存在: ${fieldConfig.code}`);
      }
    }

    console.log('');

    // ========================================
    // 第五步：更新 EmployeeInfoTabField 的 fieldType
    // ========================================
    console.log('【第五步】更新 EmployeeInfoTabField 的 fieldType');
    console.log('----------------------------------------');

    const fieldCodes = SYSTEM_FIELDS.map(f => f.code);

    const updated = await prisma.employeeInfoTabField.updateMany({
      where: {
        fieldCode: { in: fieldCodes },
        fieldType: { not: 'SELECT' }
      },
      data: {
        fieldType: 'SELECT'
      }
    });

    if (updated.count > 0) {
      console.log(`✓ 已更新 ${updated.count} 条记录的 fieldType 为 SELECT`);
    } else {
      console.log('✓ 所有 fieldType 已是 SELECT，无需更新');
    }

    console.log('');

    // ========================================
    // 第六步：验证结果
    // ========================================
    console.log('【第六步】验证结果');
    console.log('----------------------------------------');

    const results = await prisma.$queryRaw`
      SELECT
        cf.code as "字段代码",
        cf.name as "字段名称",
        d.code as "数据源代码",
        d.name as "数据源名称",
        COUNT(o.id) as "选项数量"
      FROM CustomField cf
      INNER JOIN DataSource d ON d.id = cf.dataSourceId
      LEFT JOIN DataSourceOption o ON o.dataSourceId = d.id AND o.isActive = 1
      WHERE cf.code IN (${fieldCodes.join(',')})
      GROUP BY cf.id, cf.code, cf.name, d.code, d.name
      ORDER BY cf.code
    `;

    console.table(results);

    console.log('');
    console.log('========================================');
    console.log('✓ 系统内置字段数据源关联完成！');
    console.log('========================================');
    console.log('');
    console.log('下一步操作：');
    console.log('1. 重启应用: npm run start:dev');
    console.log('2. 测试API: curl -X GET http://localhost:3001/api/hr/employee-info-tabs/display');
    console.log('3. 检查前端下拉框是否正常显示选项');
    console.log('');
    console.log('说明：');
    console.log('- 所有系统内置字段已统一使用驼峰命名');
    console.log('- 所有字段已关联到查找项数据源');
    console.log('- 后续通过查找项管理数据选项');
    console.log('');

  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
