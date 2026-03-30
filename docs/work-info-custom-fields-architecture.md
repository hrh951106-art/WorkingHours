# 工作信息自定义字段架构文档

## 概述

本文档描述了工作信息自定义字段的存储架构、字段拖拽验证规则以及相关实现细节。

## 核心功能

### 1. 字段拖拽限制

**系统字段（SYSTEM）：**
- 只能拖拽到"基本信息"（`basic_info`）或"工作信息"（`work_info`）页签
- 不能拖拽到其他系统页签（如学历信息、工作经历、家庭信息等）

**自定义字段（CUSTOM）：**
- **可以拖拽到"基本信息"（`basic_info`）或"工作信息"（`work_info`）页签**
- 可以拖拽到任何自定义页签（`isSystem = false`）
- **不能拖拽到其他系统页签**（如学历信息、工作经历、家庭信息等）

### 2. 自定义字段存储策略

自定义字段根据其所属页签分别存储在不同的表中：

#### 2.1 工作信息自定义字段

**存储位置：** `WorkInfoHistory.customFields`

**特点：**
- 支持时间轴存储（版本管理）
- 每次工作信息变更都会创建新版本
- 可以查询历史版本的自定义字段值

**包含字段：**
- 配置在"工作信息"页签（`code = 'work_info'）中的所有自定义字段
- 包括系统字段：position（职位）、jobLevel（职级）、employeeType（员工类型）、orgId（所属组织）、workLocation（工作地点）、workAddress（办公地址）

#### 2.2 其他自定义字段

**存储位置：** `Employee.customFields`

**特点：**
- 不支持时间轴存储
- 只有当前值，无历史版本

**包含字段：**
- 配置在其他页签中的自定义字段
- 例如：基本信息页签的自定义字段、其他自定义页签的字段

## 数据库架构

### 1. Employee 表

```prisma
model Employee {
  id           Int      @id @default(autoincrement())
  ...
  customFields String   @default("{}")  // 存储非工作信息页签的自定义字段
  ...
}
```

### 2. WorkInfoHistory 表

```prisma
model WorkInfoHistory {
  id             Int      @id @default(autoincrement())
  employeeId     Int
  effectiveDate  DateTime @default(now())
  endDate        DateTime?
  position       String?
  jobLevel       String?
  employeeType   String?
  orgId          Int?
  workLocation   String?
  workAddress    String?
  customFields   String   @default("{}")  // 工作信息页签的自定义字段（支持时间轴）
  isCurrent      Boolean  @default(false)
  reason         String?
  ...
}
```

## 后端实现

### 1. 字段拖拽验证

**文件：** `backend/src/modules/hr/employee-info-tab.service.ts`

**验证逻辑：**

```typescript
// 添加字段到页签时的验证
async addFieldToTab(tabId: number, dto: any) {
  // 系统字段验证
  if (fieldType === 'SYSTEM') {
    const allowedTabCodes = ['basic_info', 'work_info'];
    if (!allowedTabCodes.includes(tab.code)) {
      throw new BadRequestException(
        `系统字段只能添加到基本信息或工作信息页签`
      );
    }
  }

  // 自定义字段验证
  if (fieldType === 'CUSTOM') {
    if (tab.isSystem) {
      throw new BadRequestException(
        `自定义字段不能添加到系统页签`
      );
    }
  }
}

// 移动字段到分组时的验证
async moveFieldToGroup(fieldId: number, groupId: number | null) {
  // 同样的验证逻辑
  ...
}
```

### 2. 自定义字段分离逻辑

**文件：** `backend/src/modules/hr/hr.service.ts`

**分离逻辑：**

```typescript
async updateCurrentWorkInfo(employeeId: number, dto: any) {
  // 1. 查询工作信息页签的配置
  const workInfoTab = await this.prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        include: {
          fields: {
            where: { fieldType: 'CUSTOM' },
          },
        },
      },
    },
  });

  // 2. 收集工作信息页签的自定义字段代码
  const workInfoCustomFieldCodes = new Set<string>();
  for (const group of workInfoTab.groups) {
    for (const field of group.fields) {
      workInfoCustomFieldCodes.add(field.fieldCode);
    }
  }

  // 3. 分离自定义字段
  const workInfoCustomFields: any = {};
  const otherCustomFields: any = {};

  for (const [key, value] of Object.entries(newCustomFields)) {
    if (workInfoCustomFieldCodes.has(key)) {
      // 工作信息字段 → WorkInfoHistory.customFields
      workInfoCustomFields[key] = value;
    } else {
      // 其他字段 → Employee.customFields
      otherCustomFields[key] = value;
    }
  }

  // 4. 更新 WorkInfoHistory（工作信息字段）
  await this.prisma.workInfoHistory.update({
    where: { id: currentWorkInfo.id },
    data: {
      customFields: JSON.stringify(workInfoCustomFields),
    },
  });

  // 5. 更新 Employee（其他字段）
  await this.prisma.employee.update({
    where: { id: employeeId },
    data: {
      customFields: JSON.stringify(otherCustomFields),
    },
  });
}
```

### 3. 合并自定义字段返回

**方法：** `getWorkInfoByVersion`

**实现：**

```typescript
async getWorkInfoByVersion(employeeId: number, version: string) {
  // 1. 获取员工自定义字段
  const employeeCustomFields = JSON.parse(employee.customFields || '{}');

  // 2. 获取工作信息自定义字段
  const workInfoCustomFields = currentWorkInfo
    ? JSON.parse(currentWorkInfo.customFields || '{}')
    : {};

  // 3. 合并所有自定义字段
  const mergedCustomFields = {
    ...employeeCustomFields,
    ...workInfoCustomFields,
  };

  return {
    ...employee,
    customFields: JSON.stringify(mergedCustomFields),
    currentWorkInfo: {
      ...currentWorkInfo,
      customFields: workInfoCustomFields,
    },
  };
}
```

## 前端实现

### 1. 数据加载

**文件：** `frontend/src/pages/hr/EmployeeDetailPage.tsx`

```typescript
// 获取工作信息数据
const { data: currentWorkInfo } = useQuery({
  queryKey: ['workInfo', id, selectedWorkInfoVersion],
  queryFn: () =>
    request.get(`/hr/employees/${id}/work-info/${version}`),
});

// currentWorkInfo 结构：
// {
//   customFields: { ...所有自定义字段（合并后） },
//   currentWorkInfo: {
//     customFields: { ...工作信息自定义字段 }
//   }
// }
```

### 2. 数据显示

```typescript
// 判断数据源
const dataSource = isWorkInfo ? currentWorkInfo : employee;

// 获取自定义字段值
if (field.fieldType === 'CUSTOM') {
  let customFields;
  if (isWorkInfo) {
    // 工作信息：从 currentWorkInfo.customFields 获取
    customFields = dataSource?.currentWorkInfo?.customFields || {};
  } else {
    // 其他页签：从 employee.customFields 获取
    customFields = getCustomFields(dataSource);
  }
  value = customFields[field.fieldCode];
}
```

### 3. 数据保存

```typescript
// 编辑工作信息时，发送所有自定义字段
const customFieldsToSave = {
  ...positionInfoFields,  // 系统工作信息字段
  ...otherCustomFields,   // 所有自定义字段（包括工作信息和其他）
};

updateWorkInfoMutation.mutate({
  customFields: JSON.stringify(customFieldsToSave),
  entryInfo: employeeFieldsToSave,
});

// 后端会自动分离这些字段到正确的表
```

## 使用示例

### 1. 添加自定义字段到工作信息页签

1. 进入"人事信息配置"页面
2. 找到"工作信息"页签
3. 创建或编辑一个分组
4. 添加自定义字段到该分组
5. 保存配置

**限制：**
- 只能添加自定义字段（CUSTOM）到工作信息页签
- 不能添加系统字段（除了基本的职位相关字段）

### 2. 编辑员工工作信息

1. 进入"员工详情"页面
2. 切换到"工作信息"页签
3. 点击"编辑"按钮
4. 填写标准工作信息字段和自定义字段
5. 保存

**效果：**
- 标准字段和自定义字段都会保存到 WorkInfoHistory.customFields
- 支持版本管理，可以创建新版本

### 3. 查看历史版本

1. 在"工作信息"页签
2. 选择历史版本
3. 查看该版本的自定义字段值

## 数据迁移

### 迁移脚本

**文件：** `backend/scripts/migrate-work-info-custom-fields.ts`

**功能：**
- 将 Employee.customFields 中属于工作信息页签的字段迁移到 WorkInfoHistory.customFields
- 保留其他字段在 Employee.customFields

**运行方式：**

```bash
cd backend
npx ts-node scripts/migrate-work-info-custom-fields.ts
```

**注意：**
- 此脚本只需运行一次
- 如果数据库中没有工作信息自定义字段，脚本会安全退出

## 注意事项

### 1. 页签代码大小写

数据库中页签代码使用**小写下划线**格式：
- `basic_info`（基本信息）
- `work_info`（工作信息）
- `education_info`（学历信息）
- 等等

**代码中必须使用小写：**
- 后端查询：`where: { code: 'work_info' }`
- 前端判断：`tabCode === 'work_info'`

### 2. 自定义字段类型

自定义字段存储在 customFields JSON 字段中，支持以下类型：
- TEXT（文本）
- TEXTAREA（多行文本）
- NUMBER（数字）
- DATE（日期）
- SELECT_SINGLE（单选）
- SELECT_MULTI（多选）
- LOOKUP（关联查询）

### 3. 数据完整性

保存工作信息时：
- 前端发送所有自定义字段
- 后端根据字段配置自动分离
- 确保数据存储在正确的表中
- 保持数据一致性

## 测试验证

### 1. 字段拖拽验证

- [x] 系统字段只能拖到基本信息和工作信息页签
- [x] 自定义字段只能拖到自定义页签
- [x] 拖拽错误时显示正确的错误提示

### 2. 自定义字段存储

- [x] 工作信息自定义字段存储在 WorkInfoHistory.customFields
- [x] 其他自定义字段存储在 Employee.customFields
- [x] 创建工作信息新版本时，自定义字段支持版本管理

### 3. 前端显示

- [x] 工作信息页签正确显示自定义字段
- [x] 编辑工作信息时，自定义字段正确加载和保存
- [x] 查看历史版本时，显示该版本的自定义字段值

## 相关文件

### 后端

- `backend/prisma/schema.prisma` - 数据库模型定义
- `backend/src/modules/hr/hr.service.ts` - 核心业务逻辑
- `backend/src/modules/hr/employee-info-tab.service.ts` - 字段配置和验证
- `backend/scripts/migrate-work-info-custom-fields.ts` - 数据迁移脚本

### 前端

- `frontend/src/pages/hr/EmployeeDetailPage.tsx` - 员工详情页面
- `frontend/src/pages/hr/EmployeeInfoConfigPage.tsx` - 人事信息配置页面

## 更新日志

### 2026-03-27

- ✅ 添加 WorkInfoHistory.customFields 字段
- ✅ 实现字段拖拽验证
- ✅ 实现自定义字段分离逻辑
- ✅ 修复页签代码大小写问题（从大写改为小写）
- ✅ 更新前端支持工作信息自定义字段
- ✅ 创建数据迁移脚本
- ✅ 编写架构文档
