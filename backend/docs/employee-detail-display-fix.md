# 员工详情页面显示修复 - 完整版

## 问题描述

员工详情页的基本信息页签和工作信息页签在**预览模式下**无法正确显示字段值，但**编辑模式**下可以正常显示。

## 根本原因分析

### 问题 1: 字段类型配置错误

部分系统字段的 `fieldType` 被错误设置为 `'SELECT'` 而不是 `'SYSTEM'`，导致前端从错误的数据源读取字段值。

**影响**：
- `position`, `jobLevel`, `employeeType` - 从 customFields 读取（错误），实际应从 WorkInfoHistory 表字段读取
- `nation` - 从 customFields 读取（错误），实际应从 Employee 表字段读取
- `educationLevel`, `educationType` - 从 customFields 读取（错误），实际应从 EmployeeEducation 表字段读取

### 问题 2: 字段代码格式不匹配

数据库中使用驼峰格式（如 `jobLevel`, `employeeType`），但前端代码中使用下划线格式（如 `job_level`, `employee_type`）进行匹配。

**影响**：
- `formatValue` 函数的 `dropdownSystemFields` 数组使用下划线格式
- 无法匹配驼峰格式的 fieldCode，导致跳过标签转换
- 直接显示原始值（如 "M1"）而不是标签（如 "M1 (初级)"）

### 问题 3: 缺少字段的标签转换逻辑

`getLabelByValue` 函数缺少部分字段的标签转换处理：
- `educationType` - 学历类型
- `workLocation` - 工作地点

## 修复方案

### 修复 1: 更正字段类型

将以下字段的 `fieldType` 从 `'SELECT'` 改为 `'SYSTEM'`：

```sql
-- 工作信息页签
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode IN ('position', 'employeeType', 'resignationReason');

-- 基本信息页签
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'nation';

-- 学历信息页签
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode IN ('educationLevel', 'educationType');
```

### 修复 2: 统一字段代码格式

修改前端 `formatValue` 函数中的 `dropdownSystemFields` 数组：

**修改前**（下划线格式）：
```typescript
const dropdownSystemFields = ['gender', 'position', 'job_level', 'employee_type', 'education_level', 'marital_status', 'political_status', 'org_id', 'emergency_relation', 'nation'];
```

**修改后**（驼峰格式）：
```typescript
const dropdownSystemFields = ['gender', 'position', 'jobLevel', 'employeeType', 'educationLevel', 'educationType', 'maritalStatus', 'politicalStatus', 'orgId', 'org_id', 'emergencyRelation', 'emergency_relation', 'nation', 'workLocation', 'work_location'];
```

### 修复 3: 补充标签转换逻辑

在 `getLabelByValue` 函数中添加缺失字段的标签转换：

```typescript
// 学历类型
if (fieldCode === 'educationType' || fieldCode === 'education_type') {
  const options = getOptionsByDataSourceCode('education_type');
  const option = options.find((opt: any) => opt.value === value);
  return option?.label || value;
}

// 工作地点
if (fieldCode === 'workLocation' || fieldCode === 'work_location') {
  const options = getOptionsByDataSourceCode('work_location');
  if (options && options.length > 0) {
    const option = options.find((opt: any) => opt.value === value);
    return option?.label || value;
  }
  return value;
}
```

## 验证结果

### 数据库字段类型验证

```
✓ position: fieldType = "SYSTEM" (职位)
✓ jobLevel: fieldType = "SYSTEM" (职级)
✓ employeeType: fieldType = "SYSTEM" (员工类型)
✓ nation: fieldType = "SYSTEM" (民族)
✓ educationLevel: fieldType = "SYSTEM" (学历层次)
✓ educationType: fieldType = "SYSTEM" (学历类型)
✓ gender: fieldType = "SYSTEM" (性别)
✓ maritalStatus: fieldType = "SYSTEM" (婚姻状况)
```

### 数据源配置验证

```
✓ JOB_LEVEL (职级): 存在，有 8 个选项
✓ POSITION (职位): 存在，有 10 个选项
✓ EMPLOYEE_TYPE (员工类型): 存在，有 5 个选项
✓ education_level (学历层次): 存在，有 8 个选项
✓ education_type (学历类型): 存在，有 8 个选项
✓ marital_status (婚姻状况): 存在，有 4 个选项
✓ political_status (政治面貌): 存在，有 5 个选项
✓ nation (民族): 存在，有 8 个选项
✓ gender (性别): 存在，有 2 个选项
```

## 修复效果

修复后，员工详情页面将：

1. ✅ **基本信息页签**：所有字段（包括民族等下拉字段）正确显示
2. ✅ **工作信息页签**：职位、职级、员工类型等字段正确显示
3. ✅ **学历信息页签**：学历层次、学历类型等字段正确显示
4. ✅ **下拉字段显示**：
   - 性别：显示 "男"、"女" 而不是 "male"、"female"
   - 职级：显示 "M1 (初级)" 而不是 "M1"
   - 职位：显示 "经理" 等职位名称而不是代码
5. ✅ **预览编辑一致**：预览模式和编辑模式的数据显示完全一致

## 相关文件

### 后端修改
- `backend/scripts/check-field-types.ts` - 字段类型检查脚本
- `backend/scripts/check-all-tab-fields.ts` - 所有页签字段检查脚本
- `backend/scripts/verify-all-fixes.ts` - 修复验证脚本

### 前端修改
- `frontend/src/pages/hr/EmployeeDetailPage.tsx:2238` - dropdownSystemFields 数组
- `frontend/src/pages/hr/EmployeeDetailPage.tsx:916` - educationType 标签转换
- `frontend/src/pages/hr/EmployeeDetailPage.tsx:1005` - workLocation 标签转换

## 注意事项

1. **字段代码格式**：数据库中统一使用驼峰格式（camelCase），如 `jobLevel`, `employeeType`
2. **数据源代码格式**：DataSource.code 使用下划线格式（snake_case），如 `JOB_LEVEL`, `EMPLOYEE_TYPE`
3. **类型一致性**：系统字段必须设置 `fieldType = 'SYSTEM'`，自定义字段使用 `fieldType = 'CUSTOM'`
