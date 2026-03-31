# 员工详情页面字段显示为空问题 - 完整修复方案

## 问题描述

员工详情页面在**预览模式**下，很多字段显示为空（如政治面貌、婚姻状况、职级等），但点击**编辑按钮**后可以看到实际的值。

## 根本原因

前端代码中存在**字段代码格式不匹配**的问题：

1. **数据库中的 fieldCode**：使用驼峰格式（camelCase）
   - 例如：`maritalStatus`, `politicalStatus`, `jobLevel`, `employeeType`

2. **前端数组的字段定义**：使用下划线格式（snake_case）
   - `basicInfoFields` 数组：`['employee_no', 'marital_status', 'political_status', ...]`
   - `positionInfoFields` 数组：`['job_level', 'employee_type', ...]`

3. **数据读取逻辑**：
   ```typescript
   if (basicInfoFields.includes(field.fieldCode)) {
     // 从 employee 对象读取
   }
   ```

   当 `field.fieldCode` 是 `'maritalStatus'`（驼峰格式）时，它不会匹配数组中的 `'marital_status'`（下划线格式），导致跳过正确的数据读取逻辑，最终显示为空。

## 修复方案

### 修复 1: 更新字段数组格式

**文件**：`frontend/src/pages/hr/EmployeeDetailPage.tsx`

**修改前**：
```typescript
const basicInfoFields = ['employee_no', 'name', 'gender', 'marital_status', 'political_status', ...];
const positionInfoFields = ['position', 'job_level', 'employee_type', 'org_id', ...];
```

**修改后**：
```typescript
const basicInfoFields = ['employeeNo', 'employee_no', 'name', 'gender', 'maritalStatus', 'marital_status', 'politicalStatus', 'political_status', ...];
const positionInfoFields = ['position', 'jobLevel', 'job_level', 'employeeType', 'employee_type', 'orgId', 'org_id', ...];
```

**说明**：同时包含驼峰和下划线格式，确保无论 fieldCode 是什么格式都能匹配。

### 修复 2: 优化 mapFieldName 函数

**文件**：`frontend/src/pages/hr/EmployeeDetailPage.tsx`

**修改**：
```typescript
const mapFieldName = (code: string): string => {
  // 如果已经是驼峰格式，直接返回
  if (!code.includes('_')) {
    return code;
  }

  const fieldMapping: Record<string, string> = {
    employee_no: 'employeeNo',
    marital_status: 'maritalStatus',
    political_status: 'politicalStatus',
    // ... 其他映射
  };
  return fieldMapping[code] || code;
};
```

**说明**：
- 如果输入已经是驼峰格式（不包含下划线），直接返回原值
- 如果是下划线格式，查找映射表进行转换
- 如果映射表中没有，返回原值

### 修复 3: 添加缺失字段的标签转换

**文件**：`frontend/src/pages/hr/EmployeeDetailPage.tsx`

**添加**：
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

### 修复 4: 更新下拉系统字段数组

**文件**：`frontend/src/pages/hr/EmployeeDetailPage.tsx`

**修改前**：
```typescript
const dropdownSystemFields = ['gender', 'position', 'job_level', 'employee_type', ...];
```

**修改后**：
```typescript
const dropdownSystemFields = ['gender', 'position', 'jobLevel', 'employeeType', 'educationLevel', 'educationType', 'maritalStatus', 'politicalStatus', ...];
```

**说明**：使用驼峰格式，与数据库中的 fieldCode 保持一致。

## 修复效果

修复后，以下字段将在预览模式下正确显示：

### 基本信息页签
- ✅ 政治面貌（politicalStatus）：显示标签（如"团员"）而不是值（如"league_member"）
- ✅ 婚姻状况（maritalStatus）：显示标签（如"未婚"）而不是值（如"unmarried"）
- ✅ 性别（gender）：显示"男"/"女"而不是"male"/"female"
- ✅ 民族（nation）：显示民族名称而不是代码
- ✅ 所有其他基本信息字段

### 工作信息页签
- ✅ 职级（jobLevel）：显示"M1 (初级)"而不是"M1"
- ✅ 职位（position）：显示职位名称
- ✅ 员工类型（employeeType）：显示"全职"/"合同工"等标签
- ✅ 所有其他工作信息字段

### 学历信息页签
- ✅ 学历层次（educationLevel）：显示学历名称
- ✅ 学历类型（educationType）：显示学历类型名称

## 测试验证

运行以下脚本进行验证：

```bash
# 测试字段映射逻辑
npx ts-node scripts/test-frontend-field-mapping.ts

# 检查字段类型配置
npx ts-node scripts/verify-all-fixes.ts

# 检查数据存储位置
npx ts-node scripts/check-field-storage-locations.ts
```

## 相关文件

### 前端修改
- `frontend/src/pages/hr/EmployeeDetailPage.tsx`
  - Line 2144-2147: 更新 `basicInfoFields` 和 `positionInfoFields` 数组
  - Line 1052-1098: 优化 `mapFieldName` 函数
  - Line 916-920: 添加 `educationType` 标签转换
  - Line 1005-1012: 添加 `workLocation` 标签转换
  - Line 2238: 更新 `dropdownSystemFields` 数组

### 后端修改
- 之前已修复字段类型（SELECT → SYSTEM）
- 之前已修复数据源配置

## 注意事项

1. **字段代码格式统一**：
   - 数据库 fieldCode：驼峰格式（camelCase）
   - 前端应同时支持驼峰和下划线格式
   - 所有新字段应使用驼峰格式

2. **数据类型一致性**：
   - 系统字段：`fieldType = 'SYSTEM'`
   - 自定义字段：`fieldType = 'CUSTOM'`

3. **标签转换**：
   - 所有下拉字段必须配置对应的 DataSource
   - 前端必须实现标签转换逻辑
   - 标签转换应同时支持驼峰和下划线格式

## 完成状态

✅ 所有修复已完成
✅ 测试验证通过
✅ 预览模式和编辑模式显示一致
