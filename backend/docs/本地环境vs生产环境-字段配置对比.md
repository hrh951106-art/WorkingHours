# 本地环境 vs 生产环境 - 字段配置对比

> **检查时间**: 2025-04-01
> **本地环境**: SQLite (dev.db)
> **生产环境**: PostgreSQL

---

## 📊 完整诊断结果

### 本地环境诊断结果

#### ✅ 正常项

| 检查项 | 结果 | 说明 |
|--------|------|------|
| **DataSource表** | ✅ 正常 | 存在15个系统内置数据源 |
| **DataSourceOption表** | ✅ 正常 | 所有数据源都有选项（2-10个） |
| **数据源配置** | ✅ 正常 | gender、marital_status等数据源配置正确 |

#### ❌ 问题项

| 问题编号 | 问题描述 | 严重程度 | 影响 |
|---------|---------|---------|------|
| **问题1** | CustomField表缺少系统内置字段 | 🔴 严重 | 导致下拉字段无法获取数据源 |
| **问题2** | EmployeeInfoTabField的fieldType都是SYSTEM | 🔴 严重 | 导致前端无法识别为下拉字段 |
| **问题3** | 字段命名不一致（虽然CustomField中没有对应字段） | 🟡 中等 | 可能导致数据映射问题 |

---

## 🔍 详细问题分析

### 问题1: CustomField表缺少系统内置字段

**本地环境现状**:
```
CustomField总数: 6
系统内置字段数: 0  ❌
自定义字段数: 6    ✅
```

**现有CustomField字段**:
| ID | 字段代码 | 字段名称 | 字段类型 | 数据源ID | 系统内置 |
|----|---------|---------|---------|---------|---------|
| 1  | A01 | 工作状态 | SELECT_SINGLE | 3 | ❌ |
| 2  | A02 | 学历 | SELECT_SINGLE | 2 | ❌ |
| 3  | A03 | 岗位 | SELECT_SINGLE | 4 | ❌ |
| 4  | A04 | 工位 | SELECT_SINGLE | 6 | ❌ |
| 5  | A05 | 设备类型 | SELECT_SINGLE | 5 | ❌ |
| 6  | A06 | 人员类型 | SELECT_SINGLE | 7 | ❌ |



**缺失的系统内置字段**:
| 字段代码 | 字段名称 | 字段类型 | 应该关联的数据源 |
|---------|---------|---------|----------------|
| gender | 性别 | SELECT_SINGLE | gender |
| nation | 民族 | SELECT_SINGLE | nation |
| maritalStatus | 婚姻状况 | SELECT_SINGLE | marital_status |
| politicalStatus | 政治面貌 | SELECT_SINGLE | political_status |
| jobLevel | 职级 | SELECT_SINGLE | job_level |
| employeeType | 员工类型 | SELECT_SINGLE | employee_type |
| employmentStatus | 在职状态 | SELECT_SINGLE | employment_status |
| resignationReason | 离职原因 | SELECT_SINGLE | resignation_reason |
| educationLevel | 学历层次 | SELECT_SINGLE | education_level |
| educationType | 学历类型 | SELECT_SINGLE | education_type |
| familyRelation | 家庭关系 | SELECT_SINGLE | family_relation |



### 问题2: EmployeeInfoTabField的fieldType都是SYSTEM

**本地环境现状**:

| 字段代码 | 字段名称 | 当前类型 | 期望类型 | 状态 |
|---------|---------|---------|---------|------|
| gender | 性别 | SYSTEM | SELECT | ❌ |
| nation | 民族 | SYSTEM | SELECT | ❌ |
| maritalStatus | 婚姻状况 | SYSTEM | SELECT | ❌ |
| politicalStatus | 政治面貌 | SYSTEM | SELECT | ❌ |
| educationLevel | 学历层次 | SYSTEM | SELECT | ❌ |
| educationType | 学历类型 | SYSTEM | SELECT | ❌ |
| employeeType | 员工类型 | SYSTEM | SELECT | ❌ |
| jobLevel | 职级 | SYSTEM | SELECT | ❌ |
| position | 职位 | SYSTEM | SELECT | ❌ |
| resignationReason | 离职原因 | SYSTEM | SELECT | ❌ |

**说明**:
- 所有需要下拉选择的字段，fieldType都是`SYSTEM`
- 应该改为`SELECT`类型
- SYSTEM类型会导致前端无法识别为下拉字段

---

### 问题3: 字段命名不一致

**本地环境现状**:
- EmployeeInfoTabField使用驼峰命名: `maritalStatus`, `politicalStatus`, `educationLevel`
- CustomField中**没有**对应的系统内置字段
- 因此不存在命名冲突，但也意味着系统内置字段完全缺失

**命名规范**:
- ✅ **正确规范**: 驼峰命名 (camelCase) - `maritalStatus`, `politicalStatus`
- ❌ **错误规范**: 下划线命名 (snake_case) - `marital_status`, `political_status`




## ✅ 正常项详细说明

### DataSource表配置正常

**系统内置数据源列表** (15个):

| 数据源代码 | 数据源名称 | 类型 | 选项数量 | 状态 |
|-----------|-----------|------|---------|------|
| gender | 性别 | BUILTIN | 2 | ✅ |
| nation | 民族 | BUILTIN | 8 | ✅ |
| marital_status | 婚姻状况 | BUILTIN | 4 | ✅ |
| political_status | 政治面貌 | BUILTIN | 5 | ✅ |
| job_level | 职级 | BUILTIN | 10 | ✅ |
| employee_type | 员工类型 | BUILTIN | 7 | ✅ |
| employment_status | 在职状态 | BUILTIN | 6 | ✅ |
| resignation_reason | 离职原因 | BUILTIN | 7 | ✅ |
| education_level | 学历层次 | BUILTIN | 8 | ✅ |
| education_type | 学历类型 | BUILTIN | 8 | ✅ |
| family_relation | 家庭关系 | BUILTIN | 10 | ✅ |
| ORG_TYPE | 组织类型 | BUILTIN | 5 | ✅ |
| POSITION | 职位 | CUSTOM | 10 | ✅ |
| JOB_LEVEL | 职级 | CUSTOM | 8 | ✅ |
| EMPLOYEE_TYPE | 员工类型 | CUSTOM | 5 | ✅ |

**结论**: 数据源配置完整，所有数据源都有选项。

---

## 🔧 生产环境检查SQL

请在生产环境PostgreSQL数据库中执行以下SQL进行对比：

### 检查1: CustomField表统计

```sql
SELECT
    COUNT(*) AS "CustomField总数",
    SUM(CASE WHEN "isSystem" = true THEN 1 ELSE 0 END) AS "系统内置字段数",
    SUM(CASE WHEN "isSystem" = false THEN 1 ELSE 0 END) AS "自定义字段数"
FROM "CustomField";
```

**预期结果**:
- CustomField总数: >= 11
- 系统内置字段数: >= 11
- 自定义字段数: >= 6

**实际结果**:
 CustomField总数 | 系统内置字段数 | 自定义字段数 
-----------------+----------------+--------------
               5 |              0 |            5
(1 行记录)



### 检查2: 系统内置CustomField列表

```sql
SELECT
    code AS "字段代码",
    name AS "字段名称",
    type AS "字段类型",
    "dataSourceId" AS "数据源ID",
    d.code AS "数据源代码"
FROM "CustomField" cf
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
WHERE cf."isSystem" = true
ORDER BY cf.sort;
```

**预期结果**: 应该返回至少11条系统内置字段记录
**实际结果**: 
字段代码 | 字段名称 | 字段类型 | 数据源ID | 数据源代码 
----------+----------+----------+----------+------------
(0 行记录)



### 检查3: EmployeeInfoTabField字段类型

```sql
SELECT
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.fieldType AS "当前类型",
    CASE
        WHEN f.fieldType = 'SYSTEM' THEN '❌ 错误：应为SELECT'
        WHEN f.fieldType = 'SELECT' THEN '✅ 正确'
        ELSE '⚠️  其他'
    END AS "状态"
FROM "EmployeeInfoTabField" f
INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
WHERE f.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType', 'jobLevel'
)
ORDER BY f.fieldCode;
```

**预期结果**: 所有字段的"状态"应该显示为"✅ 正确"
**实际结果**：
   字段代码     | 字段名称 | 当前类型 |        状态         
-----------------+----------+----------+---------------------
 educationLevel  | 学历层次 | SYSTEM   | ❌ 错误：应为SELECT
 employeeType    | 员工类型 | SYSTEM   | ❌ 错误：应为SELECT
 gender          | 性别     | SYSTEM   | ❌ 错误：应为SELECT
 jobLevel        | 职级     | SYSTEM   | ❌ 错误：应为SELECT
 maritalStatus   | 婚姻状况 | SYSTEM   | ❌ 错误：应为SELECT
 nation          | 民族     | SYSTEM   | ❌ 错误：应为SELECT
 politicalStatus | 政治面貌 | SYSTEM   | ❌ 错误：应为SELECT
(7 行记录)




### 检查4: 字段命名一致性

```sql
SELECT
    f.fieldCode AS "页签字段代码",
    cf.code AS "CustomField代码",
    CASE
        WHEN f.fieldCode != cf.code THEN '⚠️  不一致'
        ELSE '✅ 一致'
    END AS "一致性状态"
FROM "EmployeeInfoTabField" f
INNER JOIN "CustomField" cf ON cf.code = f.fieldCode
WHERE f.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType', 'jobLevel'
)
ORDER BY f.fieldCode;
```

**预期结果**: 所有字段的"一致性状态"应该显示为"✅ 一致"
**实际结果**
页签字段代码 | CustomField代码 | 一致性状态 
--------------+-----------------+------------
(0 行记录)


### 检查5: 数据源选项数量

```sql
SELECT
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    COUNT(o.id) AS "选项数量",
    CASE
        WHEN COUNT(o.id) = 0 THEN '❌ 无选项'
        WHEN COUNT(o.id) > 0 THEN '✅ 有选项'
        ELSE '⚠️  未知'
    END AS "状态"
FROM "DataSource" d
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE d."isSystem" = true
GROUP BY d.id, d.code, d.name
ORDER BY d.code;
```

**预期结果**: 所有数据源的"状态"应该显示为"✅ 有选项"
**实际结果**：    数据源代码     | 数据源名称 | 选项数量 |   状态    
--------------------+------------+----------+-----------
 DEGREE             | 学位       |        8 | ✅ 有选项
 education_level    | 学历层次   |        8 | ✅ 有选项
 EDUCATION_LEVEL    | 学历层次   |        7 | ✅ 有选项
 education_type     | 学历类型   |        8 | ✅ 有选项
 EDUCATION_TYPE     | 学历类型   |       10 | ✅ 有选项
 EMPLOYEE_TYPE      | 员工类型   |        3 | ✅ 有选项
 employment_status  | 在职状态   |        6 | ✅ 有选项
 family_relation    | 家庭关系   |       10 | ✅ 有选项
 GENDER             | 性别       |        2 | ✅ 有选项
 JOB_LEVEL          | 职级       |        8 | ✅ 有选项
 MARITAL_STATUS     | 婚姻状况   |        4 | ✅ 有选项
 ORG_TYPE           | 组织类型   |        8 | ✅ 有选项
 POLITICAL_STATUS   | 政治面貌   |        5 | ✅ 有选项
 POSITION           | 职位       |       10 | ✅ 有选项
 resignation_reason | 离职原因   |        7 | ✅ 有选项



---

## 📋 对比检查清单

请将生产环境的查询结果与本地环境对比：

| 检查项 | 本地环境 | 生产环境 | 状态 |
|--------|---------|---------|------|
| **CustomField总数** | 6 | 5 | ⬜ |
| **系统内置字段数** | 0 ❌ | 0 | ⬜ |
| **自定义字段数** | 6 ✅ | 5 | ⬜ |
| **EmployeeInfoTabField字段类型** | SYSTEM ❌ | SYSTEM ❌  | ⬜ |
| **数据源数量** | 15 ✅ | 15个，EDUCATION_LEVEL与education_level重复，EDUCATION_TYPE与education_type重复| ⬜ |
| **数据源选项** | 全部有选项 ✅ | 待填写 | ⬜ |
| **字段一致性命名** |  | 无数据 | ⬜ |




---

## 🎯 结论

### 本地环境问题总结

1. **根本原因**: CustomField表缺少所有系统内置字段
2. **直接原因**: EmployeeInfoTabField的fieldType都是SYSTEM，导致前端无法识别为下拉字段
3. **数据源**: DataSource和DataSourceOption配置正常

### 建议解决方案

#### 方案1: 修复本地环境（推荐）

运行以下修复脚本：
```bash
# 在本地环境执行
sqlite3 prisma/dev.db < scripts/fix-local-environment.sql
```

#### 方案2: 重新初始化本地数据库

```bash
cd backend
npx prisma migrate reset
npm run seed
```

#### 方案3: 手动执行SQL

执行以下SQL修复本地环境：
```sql
-- 1. 插入系统内置CustomField
INSERT INTO CustomField (code, name, type, dataSourceId, isRequired, isSystem, status, createdAt, updatedAt)
VALUES
    ('gender', '性别', 'SELECT_SINGLE', (SELECT id FROM DataSource WHERE code = 'gender'), true, true, 'ACTIVE', datetime('now'), datetime('now')),
    ('nation', '民族', 'SELECT_SINGLE', (SELECT id FROM DataSource WHERE code = 'nation'), false, true, 'ACTIVE', datetime('now'), datetime('now')),
    -- ... 其他字段
;

-- 2. 更新EmployeeInfoTabField的fieldType
UPDATE EmployeeInfoTabField
SET fieldType = 'SELECT'
WHERE fieldCode IN ('gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType', 'jobLevel');
```

### 生产环境检查建议

如果生产环境也存在类似问题，请：
1. 执行上述5个检查SQL
2. 将结果与本地环境对比
3. 如果发现问题，运行生产环境修复脚本：
   ```bash
   psql -U username -d database_name -f scripts/fix-all-system-fields-datasource-prod.sql
   ```

---

**文档结束**

请将生产环境的查询结果填入对比清单，以便进一步分析。
