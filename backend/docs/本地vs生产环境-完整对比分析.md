# 本地环境 vs 生产环境 - 完整对比分析

> **检查时间**: 2025-04-01
> **本地环境**: SQLite (dev.db)
> **生产环境**: PostgreSQL

---

## 📊 检查结果对比

### 检查1: CustomField表统计

| 项目 | 本地环境 | 生产环境 | 对比 |
|------|---------|---------|------|
| **CustomField总数** | 6 | 5 | 本地多1个自定义字段 |
| **系统内置字段数** | 0 ❌ | 0 ❌ | **相同问题** |
| **自定义字段数** | 6 ✅ | 5 ✅ | 本地多1个 |

**结论**: 两个环境都缺少系统内置字段，这是根本问题。

---

### 检查2: 系统内置CustomField列表

| 环境 | 返回记录数 | 状态 |
|------|-----------|------|
| **本地环境** | 0 行 | ❌ 没有系统内置字段 |
| **生产环境** | 0 行 | ❌ 没有系统内置字段 |

**结论**: 两个环境都没有系统内置CustomField，需要创建以下字段：
- gender (性别)
- nation (民族)
- maritalStatus (婚姻状况)
- politicalStatus (政治面貌)
- educationLevel (学历层次)
- educationType (学历类型)
- jobLevel (职级)
- employeeType (员工类型)
- employmentStatus (在职状态)
- resignationReason (离职原因)
- familyRelation (家庭关系)

---

### 检查3: EmployeeInfoTabField字段类型

#### 本地环境结果

| 字段代码 | 字段名称 | 当前类型 | 状态 |
|---------|---------|---------|------|
| educationLevel | 学历层次 | SYSTEM | ❌ 错误：应为SELECT |
| employeeType | 员工类型 | SYSTEM | ❌ 错误：应为SELECT |
| gender | 性别 | SYSTEM | ❌ 错误：应为SELECT |
| jobLevel | 职级 | SYSTEM | ❌ 错误：应为SELECT |
| maritalStatus | 婚姻状况 | SYSTEM | ❌ 错误：应为SELECT |
| nation | 民族 | SYSTEM | ❌ 错误：应为SELECT |
| politicalStatus | 政治面貌 | SYSTEM | ❌ 错误：应为SELECT |

#### 生产环境结果

| 字段代码 | 字段名称 | 当前类型 | 状态 |
|---------|---------|---------|------|
| educationLevel | 学历层次 | SYSTEM | ❌ 错误：应为SELECT |
| employeeType | 员工类型 | SYSTEM | ❌ 错误：应为SELECT |
| gender | 性别 | SYSTEM | ❌ 错误：应为SELECT |
| jobLevel | 职级 | SYSTEM | ❌ 错误：应为SELECT |
| maritalStatus | 婚姻状况 | SYSTEM | ❌ 错误：应为SELECT |
| nation | 民族 | SYSTEM | ❌ 错误：应为SELECT |
| politicalStatus | 政治面貌 | SYSTEM | ❌ 错误：应为SELECT |

**结论**: 两个环境完全相同，所有需要下拉的字段类型都是SYSTEM，需要改为SELECT。

---

### 检查4: 字段命名一致性

| 环境 | 返回记录数 | 状态 |
|------|-----------|------|
| **本地环境** | 0 行 | CustomField中没有这些字段，无法检查 |
| **生产环境** | 0 行 | CustomField中没有这些字段，无法检查 |

**结论**: 由于CustomField表中没有系统内置字段，无法进行一致性检查。但这是合理的，因为字段根本不存在。

---

### 检查5: 数据源选项数量

#### 本地环境数据源 (15个)

| 数据源代码 | 数据源名称 | 选项数量 | 状态 |
|-----------|-----------|---------|------|
| EMPLOYEE_TYPE | 员工类型 | 5 | ✅ 有选项 |
| JOB_LEVEL | 职级 | 8 | ✅ 有选项 |
| ORG_TYPE | 组织类型 | 5 | ✅ 有选项 |
| POSITION | 职位 | 10 | ✅ 有选项 |
| education_level | 学历层次 | 8 | ✅ 有选项 |
| education_type | 学历类型 | 8 | ✅ 有选项 |
| employee_type | 员工类型 | 7 | ✅ 有选项 |
| employment_status | 在职状态 | 6 | ✅ 有选项 |
| family_relation | 家庭关系 | 10 | ✅ 有选项 |
| gender | 性别 | 2 | ✅ 有选项 |
| job_level | 职级 | 10 | ✅ 有选项 |
| marital_status | 婚姻状况 | 4 | ✅ 有选项 |
| nation | 民族 | 8 | ✅ 有选项 |
| political_status | 政治面貌 | 5 | ✅ 有选项 |
| resignation_reason | 离职原因 | 7 | ✅ 有选项 |

#### 生产环境数据源 (15个，有重复)

| 数据源代码 | 数据源名称 | 选项数量 | 状态 |
|-----------|-----------|---------|------|
| DEGREE | 学位 | 8 | ✅ 有选项 |
| education_level | 学历层次 | 8 | ✅ 有选项 |
| **EDUCATION_LEVEL** | 学历层次 | 7 | ⚠️ 重复 |
| education_type | 学历类型 | 8 | ✅ 有选项 |
| **EDUCATION_TYPE** | 学历类型 | 10 | ⚠️ 重复 |
| EMPLOYEE_TYPE | 员工类型 | 3 | ✅ 有选项 |
| employment_status | 在职状态 | 6 | ✅ 有选项 |
| family_relation | 家庭关系 | 10 | ✅ 有选项 |
| **GENDER** | 性别 | 2 | ⚠️ 重复 |
| JOB_LEVEL | 职级 | 8 | ✅ 有选项 |
| **MARITAL_STATUS** | 婚姻状况 | 4 | ⚠️ 重复 |
| ORG_TYPE | 组织类型 | 8 | ✅ 有选项 |
| **POLITICAL_STATUS** | 政治面貌 | 5 | ⚠️ 重复 |
| POSITION | 职位 | 10 | ✅ 有选项 |
| resignation_reason | 离职原因 | 7 | ✅ 有选项 |

**生产环境存在的问题**:
1. **EDUCATION_LEVEL** 与 **education_level** 重复
2. **EDUCATION_TYPE** 与 **education_type** 重复
3. **GENDER** 与 **gender** 可能重复
4. **MARITAL_STATUS** 与 **marital_status** 可能重复
5. **POLITICAL_STATUS** 与 **political_status** 可能重复
6. 额外有 **DEGREE** 数据源

**本地环境优势**:
- 数据源命名统一使用小写+下划线格式
- 没有重复的数据源
- 配置更规范

---

## 🎯 核心问题总结

### 本地和生产环境的共同问题

1. **❌ CustomField表缺少系统内置字段**
   - 本地: 0个系统内置字段
   - 生产: 0个系统内置字段
   - 影响: 下拉字段无法获取数据源

2. **❌ EmployeeInfoTabField的fieldType都是SYSTEM**
   - 本地: 7个字段都是SYSTEM
   - 生产: 7个字段都是SYSTEM
   - 影响: 前端无法识别为下拉字段

### 生产环境的额外问题

3. **⚠️ 数据源重复**
   - EDUCATION_LEVEL 与 education_level
   - EDUCATION_TYPE 与 education_type
   - GENDER 与 gender
   - MARITAL_STATUS 与 marital_status
   - POLITICAL_STATUS 与 political_status
   - 建议: 统一使用小写+下划线格式

---

## 🔧 修复方案

### 方案概述

需要执行以下修复步骤：

1. **创建系统内置CustomField记录**
2. **更新EmployeeInfoTabField的fieldType为SELECT**
3. **(生产环境) 清理重复的数据源**

### 本地环境修复SQL

见文件: `backend/scripts/fix-local-env-complete.sql`

### 生产环境修复SQL

见文件: `backend/scripts/fix-production-env-complete.sql`

---

## 📋 修复后的预期结果

### 修复后CustomField表应该有

| 字段代码 | 字段名称 | 字段类型 | 数据源代码 |
|---------|---------|---------|-----------|
| gender | 性别 | SELECT_SINGLE | gender |
| nation | 民族 | SELECT_SINGLE | nation |
| maritalStatus | 婚姻状况 | SELECT_SINGLE | marital_status |
| politicalStatus | 政治面貌 | SELECT_SINGLE | political_status |
| educationLevel | 学历层次 | SELECT_SINGLE | education_level |
| educationType | 学历类型 | SELECT_SINGLE | education_type |
| jobLevel | 职级 | SELECT_SINGLE | job_level |
| employeeType | 员工类型 | SELECT_SINGLE | employee_type |
| employmentStatus | 在职状态 | SELECT_SINGLE | employment_status |
| resignationReason | 离职原因 | SELECT_SINGLE | resignation_reason |
| familyRelation | 家庭关系 | SELECT_SINGLE | family_relation |

### 修复后EmployeeInfoTabField表应该

所有上述字段的fieldType应该从`SYSTEM`改为`SELECT`

---

## ✅ 验证修复成功

运行以下SQL验证修复是否成功：

```sql
-- 验证1: CustomField系统内置字段数量
SELECT COUNT(*) AS "系统内置字段数"
FROM CustomField
WHERE isSystem = 1;
-- 预期: >= 11

-- 验证2: EmployeeInfoTabField字段类型
SELECT COUNT(*) AS "正确字段数量"
FROM EmployeeInfoTabField
WHERE fieldCode IN ('gender', 'nation', 'maritalStatus', 'politicalStatus',
                    'educationLevel', 'educationType', 'jobLevel', 'employeeType',
                    'employmentStatus', 'resignationReason', 'familyRelation')
  AND fieldType = 'SELECT';
-- 预期: >= 11

-- 验证3: 数据源关联完整性
SELECT
    cf.code AS "字段代码",
    d.code AS "数据源代码",
    COUNT(o.id) AS "选项数量"
FROM CustomField cf
INNER JOIN DataSource d ON d.id = cf.dataSourceId
LEFT JOIN DataSourceOption o ON o.dataSourceId = d.id
WHERE cf.isSystem = 1
GROUP BY cf.code, d.code
HAVING COUNT(o.id) > 0;
-- 预期: 所有系统内置字段都返回，且选项数量 > 0
```

---

## 📝 修复前后对比

### 修复前

| 检查项 | 本地环境 | 生产环境 |
|--------|---------|---------|
| 系统内置CustomField | 0 ❌ | 0 ❌ |
| fieldType=SELECT | 0 ❌ | 0 ❌ |
| 下拉功能 | ❌ 不可用 | ❌ 不可用 |

### 修复后（预期）

| 检查项 | 本地环境 | 生产环境 |
|--------|---------|---------|
| 系统内置CustomField | 11+ ✅ | 11+ ✅ |
| fieldType=SELECT | 11+ ✅ | 11+ ✅ |
| 下拉功能 | ✅ 可用 | ✅ 可用 |

---

**下一步**: 执行修复SQL，然后验证修复结果。
