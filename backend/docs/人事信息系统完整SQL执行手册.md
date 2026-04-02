# 人事信息系统完整SQL执行手册

> **用途**: 诊断和修复生产环境问题
> **执行方式**: 手动复制SQL到数据库客户端执行
> **数据库**: PostgreSQL

---

## 📋 执行前准备

### 1. 备份数据库（必做！）

```sql
-- 方式1: 使用pg_dump（命令行）
-- 在系统终端执行：
-- pg_dump -U postgres -h localhost -d your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql

-- 方式2: 使用SQL备份（在SQL客户端执行）
-- 备份关键表数据
CREATE TABLE backup_employee_info_tab AS SELECT * FROM "EmployeeInfoTab";
CREATE TABLE backup_employee_info_tab_group AS SELECT * FROM "EmployeeInfoTabGroup";
CREATE TABLE backup_employee_info_tab_field AS SELECT * FROM "EmployeeInfoTabField";
```

### 2. 查看数据库版本

```sql
SELECT version();
```

---

## 🔍 第一部分：诊断SQL

### 诊断1：检查所有页签配置

```sql
-- 查看所有页签
SELECT
    id,
    code,
    name,
    sort,
    status
FROM "EmployeeInfoTab"
ORDER BY sort;
```

**期望结果**：应该返回5个页签
- basic_info (基本信息)
- work_info (工作信息)
- education_info (学历信息)
- work_experience (工作经历)
- family_info (家庭信息)

---

### 诊断2：检查三个问题页签的分组配置

```sql
-- 检查教育信息、工作经历、家庭信息的分组
SELECT
    t.code AS tabCode,
    t.name AS tabName,
    g.id AS groupId,
    g.code AS groupCode,
    g.name AS groupName,
    g.sort AS groupSort,
    g.status AS groupStatus
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
WHERE t.code IN ('education_info', 'work_experience', 'family_info')
ORDER BY t.sort, g.sort;
```

**问题诊断**：
- 如果groupId全部为NULL → **缺少分组数据** ⚠️
- 如果有分组 → 继续检查字段

---

### 诊断3：检查字段配置

```sql
-- 检查三个页签的字段配置
SELECT
    t.code AS tabCode,
    g.code AS groupCode,
    g.name AS groupName,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code IN ('education_info', 'work_experience', 'family_info')
GROUP BY t.code, t.name, g.code, g.name, g.id
ORDER BY t.sort, g.sort;
```

**问题诊断**：
- 如果fieldCount为0或NULL → **缺少字段数据** ⚠️
- 如果fieldCount > 0 → 配置正常

---

### 诊断4：与基本信息页签对比

```sql
-- 对比所有页签的配置完整性
SELECT
    t.code AS tabCode,
    t.name AS tabName,
    COUNT(DISTINCT g.id) AS groupCount,
    COUNT(f.id) AS fieldCount,
    CASE
        WHEN COUNT(DISTINCT g.id) = 0 THEN '⚠️ 无分组'
        WHEN COUNT(f.id) = 0 THEN '⚠️ 无字段'
        ELSE '✓ 配置正常'
    END AS status
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
GROUP BY t.code, t.name
ORDER BY t.sort;
```

---

### 诊断5：检查gender和emergencyRelation字段配置

```sql
-- 检查gender和emergencyRelation字段配置
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType,
    cf.id AS customFieldId,
    cf."dataSourceId",
    ds.code AS dataSourceCode,
    COUNT(dso.id) AS optionCount
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode IN ('gender', 'emergencyRelation')
GROUP BY eif.fieldCode, eif.fieldName, eif.fieldType, cf.id, cf."dataSourceId", ds.code;
```

---

## 🔧 第二部分：修复SQL

### 修复1：创建教育信息页签的分组和字段

```sql
BEGIN;

-- 创建教育信息分组
INSERT INTO "EmployeeInfoTabGroup" (
    "tabId",
    code,
    name,
    sort,
    status,
    createdAt,
    updatedAt
)
SELECT
    t.id,
    'highest_education',
    '最高学历',
    1,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
WHERE t.code = 'education_info'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabGroup" g
    WHERE g."tabId" = t.id
    AND g.code = 'highest_education'
);

-- 创建教育信息字段
INSERT INTO "EmployeeInfoTabField" (
    "groupId",
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    createdAt,
    updatedAt
)
SELECT
    g.id,
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        g.id,
        'educationLevel' AS fieldCode,
        '学历层次' AS fieldName,
        'SYSTEM' AS fieldType,
        true AS isRequired,
        false AS isHidden,
        1 AS sort
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'education_info' AND g.code = 'highest_education'

    UNION ALL

    SELECT
        g.id,
        'educationType',
        '学历类型',
        'SYSTEM',
        false,
        false,
        2
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'education_info' AND g.code = 'highest_education'

    UNION ALL

    SELECT
        g.id,
        'graduateSchool',
        '毕业院校',
        'SYSTEM',
        false,
        false,
        3
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'education_info' AND g.code = 'highest_education'

    UNION ALL

    SELECT
        g.id,
        'major',
        '专业',
        'SYSTEM',
        false,
        false,
        4
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'education_info' AND g.code = 'highest_education'

    UNION ALL

    SELECT
        g.id,
        'graduationDate',
        '毕业时间',
        'SYSTEM',
        false,
        false,
        5
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'education_info' AND g.code = 'highest_education'

    UNION ALL

    SELECT
        g.id,
        'degreeNo',
        '学位证书号',
        'SYSTEM',
        false,
        false,
        6
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'education_info' AND g.code = 'highest_education'

    UNION ALL

    SELECT
        g.id,
        'diplomaNo',
        '毕业证书号',
        'SYSTEM',
        false,
        false,
        7
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'education_info' AND g.code = 'highest_education'
) AS fields
WHERE NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabField" f
    WHERE f."groupId" = fields.id
    AND f.fieldCode = fields.fieldCode
);

COMMIT;

-- 验证教育信息配置
SELECT
    'education_info' AS tabCode,
    g.code AS groupCode,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'education_info'
GROUP BY t.code, g.code;
```

---

### 修复2：创建工作经历页签的分组和字段

```sql
BEGIN;

-- 创建工作经历分组
INSERT INTO "EmployeeInfoTabGroup" (
    "tabId",
    code,
    name,
    sort,
    status,
    createdAt,
    updatedAt
)
SELECT
    t.id,
    'work_experience_group',
    '工作经历',
    1,
    'INACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
WHERE t.code = 'work_experience'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabGroup" g
    WHERE g."tabId" = t.id
    AND g.code = 'work_experience_group'
);

-- 创建工作经历字段
INSERT INTO "EmployeeInfoTabField" (
    "groupId",
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    createdAt,
    updatedAt
)
SELECT
    g.id,
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        g.id,
        'exp_company' AS fieldCode,
        '公司名称' AS fieldName,
        'SYSTEM' AS fieldType,
        true AS isRequired,
        false AS isHidden,
        1 AS sort
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

    UNION ALL

    SELECT
        g.id,
        'exp_position',
        '职位',
        'SYSTEM',
        true,
        false,
        2
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

    UNION ALL

    SELECT
        g.id,
        'exp_start',
        '开始时间',
        'SYSTEM',
        true,
        false,
        3
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

    UNION ALL

    SELECT
        g.id,
        'exp_end',
        '结束时间',
        'SYSTEM',
        true,
        false,
        4
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

    UNION ALL

    SELECT
        g.id,
        'exp_salary',
        '离职时薪资',
        'SYSTEM',
        false,
        false,
        5
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

    UNION ALL

    SELECT
        g.id,
        'exp_reason',
        '离职原因',
        'SYSTEM',
        false,
        false,
        6
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

    UNION ALL

    SELECT
        g.id,
        'exp_description',
        '工作描述',
        'SYSTEM',
        false,
        false,
        7
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'
) AS fields
WHERE NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabField" f
    WHERE f."groupId" = fields.id
    AND f.fieldCode = fields.fieldCode
);

COMMIT;

-- 验证工作经历配置
SELECT
    'work_experience' AS tabCode,
    g.code AS groupCode,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'work_experience'
GROUP BY t.code, g.code;
```

---

### 修复3：创建家庭信息页签的分组和字段

```sql
BEGIN;

-- 创建家庭信息分组
INSERT INTO "EmployeeInfoTabGroup" (
    "tabId",
    code,
    name,
    sort,
    status,
    createdAt,
    updatedAt
)
SELECT
    t.id,
    'family_info_group',
    '家庭成员',
    1,
    'INACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
WHERE t.code = 'family_info'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabGroup" g
    WHERE g."tabId" = t.id
    AND g.code = 'family_info_group'
);

-- 创建家庭信息字段
INSERT INTO "EmployeeInfoTabField" (
    "groupId",
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    createdAt,
    updatedAt
)
SELECT
    g.id,
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        g.id,
        'member_name' AS fieldCode,
        '成员姓名' AS fieldName,
        'SYSTEM' AS fieldType,
        true AS isRequired,
        false AS isHidden,
        1 AS sort
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'family_info' AND g.code = 'family_info_group'

    UNION ALL

    SELECT
        g.id,
        'member_relation',
        '关系',
        'SYSTEM',
        true,
        false,
        2
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'family_info' AND g.code = 'family_info_group'

    UNION ALL

    SELECT
        g.id,
        'member_age',
        '年龄',
        'SYSTEM',
        false,
        false,
        3
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'family_info' AND g.code = 'family_info_group'

    UNION ALL

    SELECT
        g.id,
        'member_work',
        '工作单位',
        'SYSTEM',
        false,
        false,
        4
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'family_info' AND g.code = 'family_info_group'

    UNION ALL

    SELECT
        g.id,
        'member_phone',
        '联系电话',
        'SYSTEM',
        false,
        false,
        5
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'family_info' AND g.code = 'family_info_group'

    UNION ALL

    SELECT
        g.id,
        'member_address',
        '居住地址',
        'SYSTEM',
        false,
        false,
        6
    FROM "EmployeeInfoTab" t
    JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    WHERE t.code = 'family_info' AND g.code = 'family_info_group'
) AS fields
WHERE NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabField" f
    WHERE f."groupId" = fields.id
    AND f.fieldCode = fields.fieldCode
);

COMMIT;

-- 验证家庭信息配置
SELECT
    'family_info' AS tabCode,
    g.code AS groupCode,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'family_info'
GROUP BY t.code, g.code;
```

---

### 修复4：修复gender字段

```sql
BEGIN;

-- 删除gender的旧CustomField记录
DELETE FROM "CustomField" WHERE code = 'gender';

-- 创建gender的CustomField记录
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

-- 创建gender数据源选项（如果缺失）
INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "createdAt", "updatedAt")
SELECT
    ds.id,
    '01' AS value,
    '男' AS label,
    1 AS sort,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "DataSource" ds
WHERE ds.code IN ('gender', 'GENDER', 'Gender', 'sex')
AND NOT EXISTS (
    SELECT 1 FROM "DataSourceOption" dso
    WHERE dso."dataSourceId" = ds.id
    AND dso.value = '01'
    LIMIT 1
)
UNION ALL
SELECT
    ds.id,
    '02',
    '女',
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "DataSource" ds
WHERE ds.code IN ('gender', 'GENDER', 'Gender', 'sex')
AND NOT EXISTS (
    SELECT 1 FROM "DataSourceOption" dso
    WHERE dso."dataSourceId" = ds.id
    AND dso.value = '02'
    LIMIT 1
);

-- 更新gender字段类型为SELECT_SINGLE
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldCode" = 'gender';

COMMIT;

-- 验证gender修复
SELECT
    'gender' AS fieldCode,
    cf.id AS customFieldId,
    cf.type AS customFieldType,
    ds.code AS dataSourceCode,
    COUNT(dso.id) AS optionCount
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode = 'gender'
GROUP BY eif.fieldCode, cf.id, cf.type, ds.code;
```

---

### 修复5：修复其他系统字段（可选）

```sql
BEGIN;

-- 为其他系统字段创建CustomField记录
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
    eif."fieldCode",
    eif."fieldName",
    'SELECT_SINGLE',
    ds.id,
    '系统内置字段 - ' || eif."fieldName",
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTabField" eif
INNER JOIN "DataSource" ds ON ds.code = eif."fieldCode"
WHERE eif."fieldCode" IN (
    'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
AND NOT EXISTS (
    SELECT 1 FROM "CustomField" cf
    WHERE cf.code = eif."fieldCode"
)
AND ds.id IS NOT NULL;

-- 更新字段类型为SELECT_SINGLE
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldCode" IN (
    'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

COMMIT;
```

---

### 修复6：统一所有系统字段类型（完整版）

```sql
BEGIN;

-- 为所有系统内置字段创建CustomField记录
DELETE FROM "CustomField"
WHERE code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

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
    eif."fieldCode",
    eif."fieldName",
    'SELECT_SINGLE',
    ds.id,
    '系统内置字段 - ' || eif."fieldName",
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTabField" eif
INNER JOIN "DataSource" ds ON ds.code = eif."fieldCode"
WHERE eif."fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
AND ds.id IS NOT NULL;

-- 更新字段类型
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

COMMIT;
```

---

## ✅ 第三部分：验证SQL

### 验证1：检查所有页签配置完整性

```sql
SELECT
    t.code AS tabCode,
    t.name AS tabName,
    COUNT(DISTINCT g.id) AS groupCount,
    COUNT(f.id) AS fieldCount,
    CASE
        WHEN COUNT(DISTINCT g.id) = 0 THEN '⚠️ 无分组，页面无法渲染'
        WHEN COUNT(f.id) = 0 THEN '⚠️ 无字段，无法配置'
        ELSE '✓ 配置完整'
    END AS status
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info')
GROUP BY t.code, t.name
ORDER BY t.sort;
```

**期望结果**：
```
tabCode          tabName  groupCount  fieldCount  status
---------------  -------  -----------  ----------  --------
basic_info       基本信息       2          20        ✓ 配置完整
work_info        工作信息       2          20        ✓ 配置完整
education_info   学历信息       1          7         ✓ 配置完整
work_experience  工作经历       1          7         ✓ 配置完整
family_info      家庭信息       1          6         ✓ 配置完整
```

---

### 验证2：检查CustomField配置

```sql
SELECT
    cf.code,
    cf.name,
    cf.type,
    ds.code AS dataSourceCode,
    COUNT(dso.id) AS optionCount,
    CASE
        WHEN cf.id IS NOT NULL AND ds.id IS NOT NULL AND COUNT(dso.id) > 0
        THEN '✓ 完整'
        WHEN cf.id IS NOT NULL AND COUNT(dso.id) = 0
        THEN '⚠️ 无选项'
        WHEN cf.id IS NULL
        THEN '✗ 无CustomField'
        ELSE '?'
    END AS status
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
GROUP BY cf.code, cf.name, cf.type, ds.code
ORDER BY cf.code;
```

---

### 验证3：检查系统字段类型统一性

```sql
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType AS tabFieldType,
    cf.type AS customFieldType,
    CASE
        WHEN eif.fieldType = 'SELECT_SINGLE' AND cf.type = 'SELECT_SINGLE'
        THEN '✓ 类型一致'
        WHEN eif.fieldType != cf.type
        THEN '⚠️ 类型不一致'
        WHEN cf.id IS NULL
        THEN '⚠️ 无CustomField'
        ELSE '✓'
    END AS status
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
ORDER BY eif.fieldCode;
```

---

## 🔄 回滚SQL

如果修复后出现问题，执行以下SQL回滚：

### 回滚1：删除创建的分组和字段

```sql
BEGIN;

-- 删除家庭信息字段
DELETE FROM "EmployeeInfoTabField"
WHERE "groupId" IN (
    SELECT g.id FROM "EmployeeInfoTabGroup" g
    JOIN "EmployeeInfoTab" t ON t.id = g."tabId"
    WHERE t.code = 'family_info'
);

-- 删除工作经历字段
DELETE FROM "EmployeeInfoTabField"
WHERE "groupId" IN (
    SELECT g.id FROM "EmployeeInfoTabGroup" g
    JOIN "EmployeeInfoTab" t ON t.id = g."tabId"
    WHERE t.code = 'work_experience'
);

-- 删除教育信息字段
DELETE FROM "EmployeeInfoTabField"
WHERE "groupId" IN (
    SELECT g.id FROM "EmployeeInfoTabGroup" g
    JOIN "EmployeeInfoTab" t ON t.id = g."tabId"
    WHERE t.code = 'education_info'
);

-- 删除分组
DELETE FROM "EmployeeInfoTabGroup"
WHERE "tabId" IN (
    SELECT id FROM "EmployeeInfoTab"
    WHERE code IN ('education_info', 'work_experience', 'family_info')
);

COMMIT;
```

### 回滚2：恢复备份数据

```sql
-- 恢复表数据
TRUNCATE TABLE "EmployeeInfoTabField";
TRUNCATE TABLE "EmployeeInfoTabGroup";
TRUNCATE TABLE "EmployeeInfoTab";

INSERT INTO "EmployeeInfoTab" SELECT * FROM backup_employee_info_tab;
INSERT INTO "EmployeeInfoTabGroup" SELECT * FROM backup_employee_info_tab_group;
INSERT INTO "EmployeeInfoTabField" SELECT * FROM backup_employee_info_tab_field;
```

---

## 📊 完整验证清单

执行所有修复后，按顺序验证：

### 1. 数据库层面验证

- [ ] 所有页签都存在（5个）
- [ ] 每个页签都有分组
- [ ] 每个分组都有字段
- [ ] 字段数量正确：
  - [ ] education_info: 7个字段
  - [ ] work_experience: 7个字段
  - [ ] family_info: 6个字段
- [ ] CustomField记录已创建
- [ ] fieldType统一为SELECT_SINGLE

### 2. 人事信息配置页面验证

- [ ] 刷新页面成功
- [ ] 教育信息页签显示分组和字段
- [ ] 工作经历页签显示分组和字段
- [ ] 家庭信息页签显示分组和字段
- [ ] 可以修改字段配置
- [ ] 保存配置成功

### 3. 新增人员页面验证

- [ ] 教育信息页签可以添加教育经历
- [ ] 工作经历页签可以添加工作经历
- [ ] 家庭信息页签可以添加家庭成员
- [ ] 性别字段显示为下拉框
- [ ] 民族字段显示为下拉框
- [ ] 婚姻状况字段显示为下拉框
- [ ] 政治面貌字段显示为下拉框
- [ ] 可以选择并保存
- [ ] 保存成功无错误

---

## 📝 执行记录

**执行人**: _______________
**执行时间**: _______________
**数据库**: _______________

### 执行步骤记录

- [ ] 备份数据库
- [ ] 执行诊断SQL
- [ ] 分析诊断结果
- [ ] 执行修复SQL（教育信息）
- [ ] 执行修复SQL（工作经历）
- [ ] 执行修复SQL（家庭信息）
- [ ] 执行修复SQL（gender）
- [ ] 执行验证SQL
- [ ] 功能验证通过

### 遇到的问题

_在此记录执行过程中遇到的问题和解决方案_

---

## 🆘 紧急联系

如果执行过程中遇到严重问题：

1. **立即停止执行**
2. **执行回滚SQL**
3. **联系技术支持**

**重要提示**：
- 所有SQL都有NOT EXISTS检查，可以重复执行
- 每个修复SQL都有验证查询
- 建议逐个执行，每个执行后验证结果

---

**文档版本**: v1.0
**更新时间**: 2026-04-01
**状态**: 已验证
