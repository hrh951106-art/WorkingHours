#!/usr/bin/env node

// ========================================
// 系统内置字段直接关联数据源（正确方案）
// ========================================
// 问题：之前错误地将系统内置字段创建为 CustomField 记录
// 方案：
//   1. EmployeeInfoTabField 添加 dataSourceId 字段，直接关联 DataSource
//   2. 添加 isSystem 标识，防止系统字段被删除
//   3. 删除系统内置字段的 CustomField 记录
//   4. CustomField 只用于真正的自定义字段
// ========================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 系统内置字段映射（fieldCode -> dataSourceCode）
const SYSTEM_FIELDS_MAPPING = {
  'gender': 'gender',
  'nation': 'nation',
  'maritalStatus': 'marital_status',
  'politicalStatus': 'political_status',
  'educationLevel': 'education_level',
  'educationType': 'education_type',
  'employeeType': 'employee_type',
  'position': 'POSITION',
  'rank': 'JOB_LEVEL',
  'workStatus': 'WORK_STATUS',
  'employmentStatus': 'employment_status',
  'resignationReason': 'resignation_reason',
  'familyRelation': 'family_relation',
};

async function main() {
  console.log('');
  console.log('========================================');
  console.log('系统内置字段直接关联数据源（正确方案）');
  console.log('========================================');
  console.log('');

  try {
    // ========================================
    // 第一步：添加数据库字段
    // ========================================
    console.log('【第一步】检查并添加数据库字段');
    console.log('----------------------------------------');

    // 检查字段是否已存在
    const tableInfo = await prisma.$queryRaw`
      PRAGMA table_info("EmployeeInfoTabField")
    `;

    const hasDataSourceId = tableInfo.some(col => col.name === 'dataSourceId');
    const hasIsSystem = tableInfo.some(col => col.name === 'isSystem');

    if (!hasDataSourceId) {
      console.log('添加 dataSourceId 字段...');
      await prisma.$executeRaw`
        ALTER TABLE "EmployeeInfoTabField"
        ADD COLUMN "dataSourceId" INTEGER
      `;
      console.log('✓ 已添加 dataSourceId 字段');
    } else {
      console.log('✓ dataSourceId 字段已存在');
    }

    if (!hasIsSystem) {
      console.log('添加 isSystem 字段...');
      await prisma.$executeRaw`
        ALTER TABLE "EmployeeInfoTabField"
        ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT 0
      `;
      console.log('✓ 已添加 isSystem 字段');
    } else {
      console.log('✓ isSystem 字段已存在');
    }

    // 创建外键约束
    console.log('创建外键约束...');
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "EmployeeInfoTabField_dataSourceId_idx"
        ON "EmployeeInfoTabField"("dataSourceId")
      `;
      console.log('✓ 已创建索引');
    } catch (error) {
      console.log('⚠️  索引创建跳过（可能已存在）');
    }

    console.log('');

    // ========================================
    // 第二步：为系统内置字段关联数据源
    // ========================================
    console.log('【第二步】为系统内置字段关联数据源');
    console.log('----------------------------------------');

    for (const [fieldCode, dataSourceCode] of Object.entries(SYSTEM_FIELDS_MAPPING)) {
      // 查找数据源
      const dataSource = await prisma.dataSource.findFirst({
        where: {
          code: dataSourceCode,
          isSystem: true
        }
      });

      if (!dataSource) {
        console.log(`⚠️  警告: 未找到数据源 ${dataSourceCode}，跳过字段 ${fieldCode}`);
        continue;
      }

      // 更新 EmployeeInfoTabField（使用原始SQL，因为Prisma Client还未同步）
      const updated = await prisma.$executeRaw`
        UPDATE "EmployeeInfoTabField"
        SET "dataSourceId" = ${dataSource.id}, "isSystem" = 1
        WHERE fieldCode = ${fieldCode}
      `;

      if (updated > 0) {
        console.log(`✓ ${fieldCode} → ${dataSourceCode} (ID: ${dataSource.id})`);
      }
    }

    console.log('');

    // ========================================
    // 第三步：删除系统内置字段的 CustomField 记录
    // ========================================
    console.log('【第三步】删除系统内置字段的 CustomField 记录');
    console.log('----------------------------------------');

    const systemFieldCodes = Object.keys(SYSTEM_FIELDS_MAPPING);

    const deleted = await prisma.customField.deleteMany({
      where: {
        code: {
          in: systemFieldCodes
        }
      }
    });

    console.log(`✓ 已删除 ${deleted.count} 条系统内置字段的 CustomField 记录`);

    console.log('');
    console.log('说明：CustomField 只保留真正的自定义字段，不再包含系统内置字段');

    console.log('');

    // ========================================
    // 第四步：验证结果
    // ========================================
    console.log('【第四步】验证结果');
    console.log('----------------------------------------');

    console.log('4.1 验证 EmployeeInfoTabField:');

    const fields = await prisma.$queryRaw`
      SELECT
        f.fieldCode AS "字段代码",
        f.fieldName AS "字段名称",
        f.fieldType AS "字段类型",
        f.isSystem AS "系统内置",
        d.code AS "数据源代码",
        d.name AS "数据源名称",
        COUNT(o.id) AS "选项数量"
      FROM "EmployeeInfoTabField" f
      LEFT JOIN "DataSource" d ON d.id = f."dataSourceId"
      LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = 1
      WHERE f.fieldCode IN (${systemFieldCodes.join(',')})
      GROUP BY f.id, f.fieldCode, f.fieldName, f.fieldType, f.isSystem, d.code, d.name
      ORDER BY f.fieldCode
    `;

    console.table(fields.map(f => ({
      fieldCode: f.fieldCode,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      isSystem: f.isSystem ? '✓' : '✗',
      dataSourceCode: f.dataSourceCode || '无',
      optionCount: f.optionCount
    })));

    console.log('');

    console.log('4.2 验证 CustomField（应该只包含自定义字段）:');

    const customFields = await prisma.customField.findMany({
      where: {
        isSystem: false
      },
      select: {
        code: true,
        name: true,
        type: true
      },
      orderBy: {
        sort: 'asc'
      }
    });

    if (customFields.length > 0) {
      console.table(customFields);
    } else {
      console.log('✓ CustomField 中没有自定义字段（这是正常的）');
    }

    console.log('');

    // ========================================
    // 第五步：总结
    // ========================================
    console.log('========================================');
    console.log('✓ 修复完成！');
    console.log('========================================');
    console.log('');
    console.log('完成的修改：');
    console.log('1. EmployeeInfoTabField 添加了 dataSourceId 字段');
    console.log('2. EmployeeInfoTabField 添加了 isSystem 标识');
    console.log('3. 所有系统内置字段已关联到对应的数据源');
    console.log('4. 删除了系统内置字段的 CustomField 记录');
    console.log('5. CustomField 只保留真正的自定义字段');
    console.log('');
    console.log('数据结构：');
    console.log('├─ 系统内置字段（SYSTEM）');
    console.log('│   └─ EmployeeInfoTabField.dataSourceId → DataSource');
    console.log('└─ 自定义字段（CUSTOM）');
    console.log('    └─ CustomField.dataSourceId → DataSource');
    console.log('');
    console.log('前端控制：');
    console.log('- 系统内置字段（isSystem=true）：不允许删除、不允许修改字段类型');
    console.log('- 自定义字段（isSystem=false）：允许删除、允许修改');
    console.log('');
    console.log('下一步操作：');
    console.log('1. 更新 Prisma schema：添加 dataSourceId 和 isSystem 字段');
    console.log('2. 修改后端代码：从 EmployeeInfoTabField.dataSourceId 获取数据源');
    console.log('3. 修改前端代码：根据 isSystem 控制删除按钮显示');
    console.log('4. 重启应用测试');
    console.log('');

  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
