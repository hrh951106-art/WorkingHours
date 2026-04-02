# emergencyRelation vs gender 字段问题诊断与修复

> **问题**: emergencyRelation能获取数据但未关联数据源，gender关联了但查不到数据
> **日期**: 2026-04-01

---

## 🔍 问题现象

### emergencyRelation（紧急联系人关系）
- ✅ 字段类型：SYSTEM
- ❌ 没有CustomField记录
- ❌ 没有关联DataSource
- ✅ **但能获取到查找项数据** ⭐

### gender（性别）
- ✅ 字段类型：SYSTEM
- ✅ 有CustomField记录
- ✅ 关联了DataSource
- ❌ **但查不到数据** ⭐

---

## 🤔 为什么会出现这种差异？

### 可能原因分析

#### emergencyRelation 能获取数据的原因

**推测1：前端硬编码枚举值**
```typescript
// 前端代码中可能直接定义了枚举
const emergencyRelationOptions = [
  { value: '01', label: '配偶' },
  { value: '02', label: '父亲' },
  { value: '03', label: '母亲' },
  // ...
];
```

**推测2：使用了字段配置的settings字段**
```sql
-- EmployeeInfoTabField.settings 可能包含JSON配置
SELECT fieldCode, settings
FROM "EmployeeInfoTabField"
WHERE fieldCode = 'emergencyRelation';
```

**推测3：后端特殊处理**
```typescript
// employee-info-tab.service.ts 中可能有特殊逻辑
if (field.fieldCode === 'emergencyRelation') {
  // 返回硬编码的选项
  return { ...field, options: [...] };
}
```

---

#### gender 查不到数据的原因

**可能1：CustomField.dataSourceId 错误**
```sql
-- 检查是否指向了正确的gender数据源
SELECT
    cf.code,
    cf."dataSourceId",
    ds.code AS "实际数据源",
    ds.name AS "数据源名称"
FROM "CustomField" cf
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
WHERE cf.code = 'gender';
-- 如果 dataSource_code != 'gender'，说明关联错误
```

**可能2：DataSourceOption 为空**
```sql
-- 检查数据源是否有选项
SELECT COUNT(*)
FROM "DataSourceOption"
WHERE "dataSourceId" = (SELECT "dataSourceId" FROM "DataSource" WHERE code = 'gender');
-- 如果返回0，说明没有选项
```

**可能3：CustomField.type 不匹配**
```sql
-- 检查CustomField类型
SELECT type FROM "CustomField" WHERE code = 'gender';
-- 如果不是 SELECT_SINGLE，可能导致不加载选项
```

**可能4：数据源代码不匹配**
```sql
-- 检查数据源代码
SELECT code, name FROM "DataSource" WHERE code LIKE '%gender%';
-- 可能数据源代码不是 'gender' 而是 'GENDER' 或其他
```

---

## 🛠️ 排查步骤

### Step 1: 执行诊断SQL

```bash
psql -U postgres -h localhost -d your_database \
  -f backend/scripts/production-diagnose-emergencyRelation-gender.sql
```

这会输出9个步骤的详细诊断信息。

### Step 2: 分析诊断结果

#### 关键检查点

**检查1：CustomField记录**
```sql
SELECT
    code,
    "dataSourceId",
    type
FROM "CustomField"
WHERE code IN ('emergencyRelation', 'gender');
```

- emergencyRelation 应该：无记录 OR dataSourceId = NULL
- gender 应该：有记录 AND dataSourceId 不为NULL

**检查2：数据源关联**
```sql
SELECT
    cf.code AS fieldCode,
    ds.code AS "实际关联的数据源",
    ds.id AS "数据源ID",
    COUNT(dso.id) AS "选项数量"
FROM "CustomField" cf
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE cf.code IN ('emergencyRelation', 'gender')
GROUP BY cf.code, ds.code, ds.id;
```

**期望结果**：
- emergencyRelation：无记录 OR 选项数量 = 0
- gender：数据源代码 = 'gender' AND 选项数量 > 0

**检查3：数据源代码匹配**
```sql
-- 检查是否有gender相关的数据源
SELECT
    id,
    code,
    name,
    type
FROM "DataSource"
WHERE code IN ('gender', 'GENDER', 'Gender', 'sex')
ORDER BY code;
```

---

## 🔧 修复方案

### 方案A：修复gender字段（如果数据源配置错误）

#### 情况1：dataSourceId指向错误的数据源

```sql
-- 查看当前关联
SELECT
    cf.code,
    cf."dataSourceId",
    ds.code AS "当前数据源"
FROM "CustomField" cf
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
WHERE cf.code = 'gender';

-- 如果当前数据源不是gender，修正为正确的gender数据源
UPDATE "CustomField"
SET "dataSourceId" = (
    SELECT id FROM "DataSource" WHERE code = 'gender' LIMIT 1
)
WHERE code = 'gender';

-- 验证修改
SELECT
    cf.code,
    ds.code AS "数据源代码",
    COUNT(dso.id) AS "选项数"
FROM "CustomField" cf
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE cf.code = 'gender'
GROUP BY cf.code, ds.code;
```

#### 情况2：DataSourceOption 为空

```sql
-- 检查是否有gender数据源但没有选项
SELECT
    ds.id,
    ds.code,
    ds.name,
    COUNT(dso.id) AS "选项数"
FROM "DataSource" ds
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE ds.code = 'gender'
GROUP BY ds.id, ds.code, ds.name;

-- 如果选项数为0，需要添加选项
INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "createdAt", "updatedAt")
VALUES
  ((SELECT id FROM "DataSource" WHERE code = 'gender'), '01', '男', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ((SELECT id FROM "DataSource" WHERE code = 'gender'), '02', '女', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

#### 情况3：数据源代码不匹配

```sql
-- 假设实际数据源代码是 'GENDER' 而不是 'gender'
-- 需要统一为小写

-- 方式1：修改DataSource代码（推荐）
UPDATE "DataSource"
SET code = 'gender'
WHERE code = 'GENDER';

-- 方式2：修改CustomField关联
UPDATE "CustomField"
SET "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'GENDER')
WHERE code = 'gender';
```

---

### 方案B：统一使用数据源（推荐）

让emergencyRelation也使用数据源，保持一致性：

```sql
-- Step 1: 检查是否有emergencyRelation数据源
SELECT id, code, name, COUNT(*) AS optionCount
FROM "DataSource" ds
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE ds.code IN ('emergencyRelation', 'familyRelation', 'FAMILY_RELATION')
GROUP BY ds.id, ds.code, ds.name;

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
    ds.id,
    '系统内置字段 - ' || eif."fieldName",
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTabField" eif
INNER JOIN "DataSource" ds ON ds.code IN ('emergencyRelation', 'familyRelation')
WHERE eif.fieldCode = 'emergencyRelation'
AND ds.id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM "CustomField" cf WHERE cf.code = 'emergencyRelation'
);

-- Step 3: 更新字段类型
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldCode" = 'emergencyRelation';

-- Step 4: 验证
SELECT
    eif.fieldCode,
    eif.fieldType,
    cf."dataSourceId",
    ds.code AS dataSourceCode,
    COUNT(dso.id) AS optionCount
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
GROUP BY eif.fieldCode, eif.fieldType, cf."dataSourceId", ds.code;
```

---

### 方案C：查找emergencyRelation的硬编码位置

如果emergencyRelation使用硬编码，建议改为数据源配置：

#### 1. 查找前端代码

```bash
# 在前端代码中搜索
cd frontend
grep -r "emergencyRelation" src/ --include="*.tsx" --include="*.ts"
grep -r "配偶\|父亲\|母亲" src/pages/hr/ --include="*.tsx"
```

#### 2. 查找后端代码

```bash
# 在后端代码中搜索
cd backend
grep -r "emergencyRelation" src/ --include="*.ts"
grep -r "enrichFieldWithType" src/modules/hr/
```

#### 3. 修改为使用数据源

如果找到硬编码，修改为从CustomField获取：

```typescript
// 修改前（硬编码）
if (field.fieldCode === 'emergencyRelation') {
  return {
    ...field,
    options: [
      { value: '01', label: '配偶' },
      { value: '02', label: '父亲' },
      // ...
    ]
  };
}

// 修改后（使用数据源）
const customField = customFields.find(cf => cf.code === field.fieldCode);
if (customField && customField.dataSource) {
  return {
    ...field,
    type: 'SELECT_SINGLE',
    dataSource: customField.dataSource
  };
}
```

---

## ✅ 验证修复

### 验证SQL

```sql
-- 验证两个字段配置一致
WITH field_check AS (
    SELECT
        eif.fieldCode,
        eif.fieldType,
        cf.id AS customFieldId,
        cf."dataSourceId",
        ds.code AS dataSourceCode,
        COUNT(dso.id) AS optionCount,
        CASE
            WHEN cf.id IS NOT NULL AND ds.id IS NOT NULL AND COUNT(dso.id) > 0
            THEN '✓ 完整配置'
            WHEN cf.id IS NULL
            THEN '⚠️ 无CustomField（可能使用硬编码）'
            ELSE '✗ 配置不完整'
        END AS status
    FROM "EmployeeInfoTabField" eif
    LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
    LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
    LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
    WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
    GROUP BY eif.fieldCode, eif.fieldType, cf.id, cf."dataSourceId", ds.code
)
SELECT * FROM field_check ORDER BY fieldCode;
```

### 功能验证

1. **清除浏览器缓存**（Ctrl+Shift+Delete）
2. **打开新增人员页面**
3. **测试emergencyRelation字段**：
   - [ ] 显示为下拉框
   - [ ] 有选项（配偶、父亲、母亲等）
   - [ ] 可以选择
4. **测试gender字段**：
   - [ ] 显示为下拉框
   - [ ] 有选项（2个）
   - [ ] 可以选择
5. **测试保存**：
   - [ ] 选择任意值
   - [ ] 保存成功
   - [ ] 数据正确保存

---

## 📊 配置一致性建议

### 推荐配置模式

所有下拉类型的字段应该遵循统一配置：

```
EmployeeInfoTabField
  └─ fieldType = 'SELECT_SINGLE'  ← 统一类型

CustomField
  ├─ code = 字段代码
  ├─ type = 'SELECT_SINGLE'
  └─ dataSourceId = DataSource.id  ← 关联数据源

DataSource
  ├─ code = 字段代码（如 'gender'）
  └─ name = 数据源名称

DataSourceOption
  ├─ value = '01'
  ├─ label = '男'
  └─ sort = 1
```

### 检查所有下拉字段配置

```sql
-- 检查所有应该是下拉框的字段配置
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType AS currentType,
    cf.type AS customFieldType,
    ds.code AS dataSourceCode,
    COUNT(dso.id) AS optionCount,
    CASE
        WHEN cf.id IS NULL THEN '⚠️ 缺少CustomField'
        WHEN ds.id IS NULL THEN '⚠️ 未关联数据源'
        WHEN COUNT(dso.id) = 0 THEN '⚠️ 数据源无选项'
        WHEN eif.fieldType NOT IN ('SELECT_SINGLE', 'SELECT_MULTI')
        THEN '⚠️ 字段类型不是SELECT'
        ELSE '✓ 配置正确'
    END AS status
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation',
    'emergencyRelation'  -- 加上这个
)
GROUP BY eif.fieldCode, eif.fieldName, eif.fieldType, cf.type, ds.code
ORDER BY status, eif.fieldCode;
```

---

## 🎯 总结

### 问题根源

1. **emergencyRelation**：
   - 可能使用硬编码枚举值
   - 未使用标准的CustomField+DataSource配置
   - 需要统一配置

2. **gender**：
   - CustomField配置可能有问题
   - dataSourceId可能指向错误
   - DataSourceOption可能为空

### 解决方案

**短期**：修复gender的CustomField配置

**长期**：统一所有下拉字段为标准配置（CustomField + DataSource）

### 下一步

1. 执行诊断SQL
2. 分析具体问题点
3. 应用对应的修复方案
4. 验证修复效果
5. 统一所有字段配置
