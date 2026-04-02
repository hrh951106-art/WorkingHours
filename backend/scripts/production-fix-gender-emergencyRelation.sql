-- ================================================================================
-- gender和emergencyRelation字段修复SQL
-- ================================================================================
-- 问题：emergencyRelation能获取数据但未关联数据源，gender关联了但查不到数据
-- ================================================================================

BEGIN;

-- ================================================================================
-- 诊断信息输出
-- ================================================================================

-- 1. 当前配置状态
SELECT '=== 当前配置状态 ===' AS info;
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType AS tab_fieldType,
    cf.id AS customFieldId,
    cf."dataSourceId" AS cf_dataSourceId,
    ds.code AS dataSource_code,
    ds.name AS dataSource_name,
    ds.id AS dataSource_id,
    COUNT(dso.id) AS optionCount
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
GROUP BY eif.fieldCode, eif.fieldName, eif.fieldType, cf.id, cf."dataSourceId", ds.code, ds.name, ds.id
ORDER BY eif.fieldCode;

-- ================================================================================
-- 修复gender字段
-- ================================================================================

SELECT '=== 开始修复gender字段 ===' AS info;

-- Step 1: 检查gender数据源是否存在
DO $$
DECLARE
    v_gender_ds_id INTEGER;
    v_cf_id INTEGER;
BEGIN
    -- 查找gender数据源
    SELECT id INTO v_gender_ds_id
    FROM "DataSource"
    WHERE code IN ('gender', 'GENDER', 'Gender', 'sex')
    ORDER BY CASE
        WHEN code = 'gender' THEN 1
        WHEN code = 'GENDER' THEN 2
        WHEN code = 'Gender' THEN 3
        ELSE 4
    END
    LIMIT 1;

    IF v_gender_ds_id IS NULL THEN
        RAISE NOTICE '⚠️ 未找到gender数据源，需要先创建数据源';
    ELSE
        RAISE NOTICE '✓ 找到gender数据源，ID: %', v_gender_ds_id;
    END IF;

    -- 检查CustomField记录
    SELECT id INTO v_cf_id
    FROM "CustomField"
    WHERE code = 'gender';

    IF v_cf_id IS NULL THEN
        RAISE NOTICE '⚠️ 未找到gender的CustomField记录';
    ELSE
        RAISE NOTICE '✓ 找到gender的CustomField记录，ID: %', v_cf_id;
    END IF;
END $$;

-- Step 2: 创建或修复gender的CustomField记录
DELETE FROM "CustomField" WHERE code = 'gender';

INSERT INTO "CustomField" (
    code,
    name,
    type,
    "dataSourceId",
    description,
    "isSystem",
    status,
    createdAt,
    updatedAt
)
SELECT
    'gender',
    eif."fieldName",
    'SELECT_SINGLE',
    (
        SELECT id FROM "DataSource"
        WHERE code IN ('gender', 'GENDER', 'Gender', 'sex')
        ORDER BY CASE
            WHEN code = 'gender' THEN 1
            WHEN code = 'GENDER' THEN 2
            WHEN code = 'Gender' THEN 3
            ELSE 4
        END
        LIMIT 1
    ),
    '系统内置字段 - 性别',
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTabField" eif
WHERE eif.fieldCode = 'gender'
AND EXISTS (
    SELECT 1 FROM "DataSource"
    WHERE code IN ('gender', 'GENDER', 'Gender', 'sex')
);

-- Step 3: 检查并创建gender数据源选项（如果缺失）
INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "createdAt", "updatedAt")
SELECT
    ds.id,
    UNNEST(ARRAY['01', '02']) AS value,
    UNNEST(ARRAY['男', '女']) AS label,
    UNNEST(ARRAY[1, 2]) AS sort,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "DataSource" ds
WHERE ds.code IN ('gender', 'GENDER', 'Gender', 'sex')
AND NOT EXISTS (
    SELECT 1 FROM "DataSourceOption" dso
    WHERE dso."dataSourceId" = ds.id
    LIMIT 1
)
LIMIT 1;

-- Step 4: 更新EmployeeInfoTabField字段类型
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldCode" = 'gender';

-- 验证gender修复
SELECT '=== gender修复验证 ===' AS info;
SELECT
    'gender' AS fieldCode,
    cf.id AS customFieldId,
    cf.type AS customFieldType,
    cf."dataSourceId",
    ds.code AS dataSource_code,
    COUNT(dso.id) AS optionCount,
    CASE
        WHEN cf.id IS NOT NULL AND ds.id IS NOT NULL AND COUNT(dso.id) > 0
        THEN '✓ gender配置完整'
        ELSE '✗ gender配置不完整'
    END AS status
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode = 'gender'
GROUP BY cf.id, cf.type, cf."dataSourceId", ds.code;

-- ================================================================================
-- 修复emergencyRelation字段
-- ================================================================================

SELECT '=== 开始修复emergencyRelation字段 ===' AS info;

-- Step 1: 检查emergencyRelation数据源
SELECT
    id,
    code,
    name,
    type,
    "isSystem"
FROM "DataSource"
WHERE code IN ('emergencyRelation', 'familyRelation', 'FAMILY_RELATION', 'EMERGENCY_RELATION')
ORDER BY CASE
    WHEN code = 'emergencyRelation' THEN 1
    WHEN code = 'familyRelation' THEN 2
    WHEN code = 'FAMILY_RELATION' THEN 3
    ELSE 4
END;

-- Step 2: 如果有数据源，创建CustomField记录
INSERT INTO "CustomField" (
    code,
    name,
    type,
    "dataSourceId",
    description,
    "isSystem",
    status,
    createdAt,
    updatedAt
)
SELECT
    'emergencyRelation',
    eif."fieldName",
    'SELECT_SINGLE',
    (
        SELECT id FROM "DataSource"
        WHERE code IN ('emergencyRelation', 'familyRelation', 'FAMILY_RELATION')
        ORDER BY CASE
            WHEN code = 'emergencyRelation' THEN 1
            WHEN code = 'familyRelation' THEN 2
            WHEN code = 'FAMILY_RELATION' THEN 3
            ELSE 4
        END
        LIMIT 1
    ),
    '系统内置字段 - ' || eif."fieldName",
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTabField" eif
WHERE eif.fieldCode = 'emergencyRelation'
AND EXISTS (
    SELECT 1 FROM "DataSource"
    WHERE code IN ('emergencyRelation', 'familyRelation', 'FAMILY_RELATION')
)
AND NOT EXISTS (
    SELECT 1 FROM "CustomField" cf WHERE cf.code = 'emergencyRelation'
);

-- Step 3: 更新字段类型
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldCode" = 'emergencyRelation';

-- 验证emergencyRelation修复
SELECT '=== emergencyRelation修复验证 ===' AS info;
SELECT
    'emergencyRelation' AS fieldCode,
    cf.id AS customFieldId,
    cf.type AS customFieldType,
    cf."dataSourceId",
    ds.code AS dataSource_code,
    COUNT(dso.id) AS optionCount,
    CASE
        WHEN cf.id IS NOT NULL AND ds.id IS NOT NULL AND COUNT(dso.id) > 0
        THEN '✓ emergencyRelation配置完整'
        WHEN cf.id IS NOT NULL AND COUNT(dso.id) = 0
        THEN '⚠️ emergencyRelation有CustomField但数据源无选项'
        WHEN cf.id IS NULL
        THEN '⚠️ emergencyRelation无CustomField（可能使用硬编码）'
        ELSE '✗ emergencyRelation配置不完整'
    END AS status
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode = 'emergencyRelation'
GROUP BY cf.id, cf.type, cf."dataSourceId", ds.code;

COMMIT;

-- ================================================================================
-- 最终验证
-- ================================================================================

SELECT '=== 最终验证结果 ===' AS info;

WITH field_summary AS (
    SELECT
        eif.fieldCode,
        eif.fieldName,
        eif.fieldType,
        cf.id AS customFieldId,
        cf.type AS customFieldType,
        cf."dataSourceId",
        ds.code AS dataSourceCode,
        COUNT(dso.id) AS optionCount,
        CASE
            WHEN cf.id IS NOT NULL AND ds.id IS NOT NULL AND COUNT(dso.id) > 0
            THEN '✓ 完整配置（有CustomField和数据源选项）'
            WHEN cf.id IS NOT NULL AND ds.id IS NOT NULL AND COUNT(dso.id) = 0
            THEN '⚠️ 有CustomField但数据源无选项'
            WHEN cf.id IS NULL
            THEN '⚠️ 无CustomField（可能使用硬编码）'
            ELSE '✗ 配置不完整'
        END AS status
    FROM "EmployeeInfoTabField" eif
    LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
    LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
    LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
    WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
    GROUP BY eif.fieldCode, eif.fieldName, eif.fieldType, cf.id, cf.type, cf."dataSourceId", ds.code
)
SELECT
    fieldCode,
    fieldName,
    fieldType,
    customFieldId,
    customFieldType,
    dataSourceCode,
    optionCount,
    status
FROM field_summary
ORDER BY fieldCode;

/*
执行后请检查：

1. gender字段：
   - customFieldId 不为 NULL ✓
   - customFieldType = 'SELECT_SINGLE' ✓
   - dataSourceCode = 'gender'（或类似）✓
   - optionCount > 0 ✓
   - status = '✓ 完整配置' ✓

2. emergencyRelation字段：
   - 选项1：status = '✓ 完整配置'（如果有数据源）
   - 选项2：status = '⚠️ 无CustomField'（如果使用硬编码）
     - 这种情况需要查找前端代码中的硬编码位置

下一步：
1. 部署支持SELECT_SINGLE的前端代码
2. 清除浏览器缓存
3. 测试两个字段的功能
4. 如果emergencyRelation使用硬编码，考虑修改为数据源配置
*/
