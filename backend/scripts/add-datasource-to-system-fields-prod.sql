-- ========================================
-- 系统内置字段直接关联数据源（生产环境PostgreSQL）
-- ========================================
-- 问题：系统内置字段不应该通过 CustomField 处理
-- 方案：
--   1. EmployeeInfoTabField 添加 dataSourceId 字段，直接关联 DataSource
--   2. 添加 isSystem 标识，防止系统字段被删除
--   3. 删除系统内置字段的 CustomField 记录
--   4. CustomField 只用于真正的自定义字段
-- ========================================

\echo ''
\echo '========================================'
\echo '系统内置字段直接关联数据源（正确方案）'
\echo '========================================'
\echo ''

-- ========================================
-- 第一步：添加数据库字段
-- ========================================

\echo '【第一步】添加数据库字段'
\echo '----------------------------------------'

\echo '1.1 添加 isSystem 字段:'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = '"EmployeeInfoTabField"'::regclass
        AND attname = 'isSystem'
    ) THEN
        ALTER TABLE "EmployeeInfoTabField"
        ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE '✓ 已添加 isSystem 字段';
    ELSE
        RAISE NOTICE '✓ isSystem 字段已存在';
    END IF;
END $$;

\echo ''

\echo '1.2 添加 dataSourceId 字段:'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = '"EmployeeInfoTabField"'::regclass
        AND attname = 'dataSourceId'
    ) THEN
        ALTER TABLE "EmployeeInfoTabField"
        ADD COLUMN "dataSourceId" INTEGER;
        RAISE NOTICE '✓ 已添加 dataSourceId 字段';
    ELSE
        RAISE NOTICE '✓ dataSourceId 字段已存在';
    END IF;
END $$;

\echo ''

\echo '1.3 创建索引:'

CREATE INDEX IF NOT EXISTS "EmployeeInfoTabField_dataSourceId_idx"
ON "EmployeeInfoTabField"("dataSourceId");

\echo '✓ 已创建索引'

\echo ''

\echo '1.4 添加外键约束:'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'EmployeeInfoTabField_dataSourceId_fkey'
    ) THEN
        ALTER TABLE "EmployeeInfoTabField"
        ADD CONSTRAINT "EmployeeInfoTabField_dataSourceId_fkey"
        FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"(id) ON DELETE SET NULL;
        RAISE NOTICE '✓ 已添加外键约束';
    ELSE
        RAISE NOTICE '✓ 外键约束已存在';
    END IF;
END $$;

\echo ''

-- ========================================
-- 第二步：为系统内置字段关联数据源
-- ========================================

\echo '【第二步】为系统内置字段关联数据源'
\echo '----------------------------------------'

\echo '2.1 更新系统内置字段:'

UPDATE "EmployeeInfoTabField" f
SET
    "dataSourceId" = d.id,
    "isSystem" = TRUE
FROM "DataSource" d
WHERE f.fieldCode = (
    CASE d.code
        WHEN 'gender' THEN 'gender'
        WHEN 'nation' THEN 'nation'
        WHEN 'marital_status' THEN 'maritalStatus'
        WHEN 'political_status' THEN 'politicalStatus'
        WHEN 'education_level' THEN 'educationLevel'
        WHEN 'education_type' THEN 'educationType'
        WHEN 'employee_type' THEN 'employeeType'
        WHEN 'POSITION' THEN 'position'
        WHEN 'JOB_LEVEL' THEN 'rank'
        WHEN 'WORK_STATUS' THEN 'workStatus'
        WHEN 'employment_status' THEN 'employmentStatus'
        WHEN 'resignation_reason' THEN 'resignationReason'
        WHEN 'family_relation' THEN 'familyRelation'
    END
)
AND d."isSystem" = TRUE
AND f.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'employeeType', 'position',
    'rank', 'workStatus', 'employmentStatus', 'resignationReason',
    'familyRelation'
);

\echo '✓ 已更新系统内置字段'

\echo ''

\echo '2.2 查看更新结果:'

SELECT
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.isSystem AS "系统内置",
    d.code AS "数据源代码",
    d.name AS "数据源名称"
FROM "EmployeeInfoTabField" f
LEFT JOIN "DataSource" d ON d.id = f."dataSourceId"
WHERE f.isSystem = TRUE
ORDER BY f.fieldCode;

\echo ''

-- ========================================
-- 第三步：删除系统内置字段的 CustomField 记录
-- ========================================

\echo '【第三步】删除系统内置字段的 CustomField 记录'
\echo '----------------------------------------'

DELETE FROM "CustomField"
WHERE code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'employeeType', 'position',
    'rank', 'workStatus', 'employmentStatus', 'resignationReason',
    'familyRelation'
);

\echo '✓ 已删除系统内置字段的 CustomField 记录'

\echo ''
\echo '说明：CustomField 只保留真正的自定义字段，不再包含系统内置字段'

\echo ''

-- ========================================
-- 第四步：验证结果
-- ========================================

\echo '【第四步】验证结果'
\echo '----------------------------------------'

\echo '4.1 验证 EmployeeInfoTabField:'

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
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = TRUE
WHERE f.isSystem = TRUE
GROUP BY f.id, f.fieldCode, f.fieldName, f.fieldType, f.isSystem, d.code, d.name
ORDER BY f.fieldCode;

\echo ''

\echo '4.2 验证 CustomField（应该只包含自定义字段）:'

SELECT
    cf.code AS "字段代码",
    cf.name AS "字段名称",
    cf.type AS "字段类型",
    cf.isSystem AS "系统内置",
    d.code AS "数据源代码"
FROM "CustomField" cf
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
ORDER BY cf.code
LIMIT 20;

\echo ''

\echo '4.3 统计信息:'

SELECT
    '系统内置字段（EmployeeInfoTabField）' AS "类型",
    COUNT(*) AS "数量"
FROM "EmployeeInfoTabField"
WHERE isSystem = TRUE
UNION ALL
SELECT
    '自定义字段（CustomField）',
    COUNT(*)
FROM "CustomField"
WHERE isSystem = FALSE;

\echo ''

\echo '========================================'
\echo '✓ 修复完成！'
\echo '========================================'
\echo ''
\echo '完成的修改：'
\echo '1. EmployeeInfoTabField 添加了 isSystem 字段'
\echo '2. EmployeeInfoTabField 添加了 dataSourceId 字段'
\echo '3. 创建了索引和外键约束'
\echo '4. 所有系统内置字段已关联到对应的数据源'
\echo '5. 删除了系统内置字段的 CustomField 记录'
\echo '6. CustomField 只保留真正的自定义字段'
\echo ''
\echo '数据结构：'
\echo '├─ 系统内置字段（isSystem = true）'
\echo '│   └─ EmployeeInfoTabField.dataSourceId → DataSource'
\echo '└─ 自定义字段（isSystem = false）'
\echo '    └─ CustomField.dataSourceId → DataSource'
\echo ''
\echo '前端控制：'
\echo '- 系统内置字段（isSystem=true）：不允许删除、不允许修改字段类型'
\echo '- 自定义字段（isSystem=false）：允许删除、允许修改'
\echo ''
\echo '下一步操作：'
\echo '1. 更新 Prisma schema：添加 dataSourceId 和 isSystem 字段'
\echo '2. 运行: npx prisma generate'
\echo '3. 修改后端代码：从 EmployeeInfoTabField.dataSourceId 获取数据源'
\echo '4. 修改前端代码：根据 isSystem 控制删除按钮显示'
\echo '5. 重启应用测试'
\echo ''
