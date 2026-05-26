# 工作信息异动逻辑问题修复总结

## 问题描述

1. **异动生效日期设置错误**：员工做了4月15日的异动后，被错误地设置为当前版本
2. **历史版本数据一直加载中**：切换到2025-01-01版本时一直显示"正在加载中"
3. **历史版本数据缺失**：工号和入职日期等字段没有显示
4. **界面冗余**：顶部有不需要的"更正"和"更新"按钮

## 问题分析

### 1. 当前版本设置逻辑错误

**问题**：异动生效日期是2026-04-15（未来日期），但被设置为当前版本

**原因**：创建异动时，直接将新的 WorkInfoHistory 记录设置为 `isCurrent: true`，没有考虑生效日期

**正确逻辑**：
- 当前版本应该是生效日期 **<= 今天** 的最新记录
- 如果异动生效日期在未来，当前版本应该保持不变

### 2. 历史版本数据加载失败

**问题**：切换到2025-01-01版本时一直显示"正在加载中"

**原因**：后端 `getWorkInfoByVersion` 方法在处理历史版本时使用了错误的逻辑

**原代码问题**：
```typescript
// 原代码：通过 employeeChangeLog 回溯历史状态
const changeLogs = await this.prisma.employeeChangeLog.findMany({...});
const snapshot = { /* 不完整的数据结构 */ };
return snapshot; // ❌ 缺少 currentWorkInfo 字段
```

**修复方案**：
```typescript
// 修复后：直接从 WorkInfoHistory 表获取
const historyWorkInfo = await this.prisma.workInfoHistory.findFirst({
  where: { id: historyId, employeeId },
  include: { org: true },
});

return {
  ...employee,
  currentWorkInfo: { // ✅ 完整的数据结构
    ...historyWorkInfo,
    customFields: workInfoCustomFields,
  },
  educations,
  workExperiences,
  familyMembers,
};
```

### 3. 工号和入职日期不显示

**问题**：历史版本中工号和入职日期没有值

**原因**：
- `employeeNo` 和 `entryDate` 是 Employee 表的字段，不属于 WorkInfoHistory 表
- 前端从 `currentWorkInfo.currentWorkInfo` 读取这些字段，但历史版本中没有这些数据

**解决方案**：
- 后端在返回数据时，始终从 Employee 表获取 `employeeNo` 和 `entryDate`
- 前端从 `employee.employeeNo` 和 `employee.entryDate` 读取（而不是从 `currentWorkInfo`）

### 4. 顶部按钮冗余

**问题**：工作信息页签顶部有"更正"和"更新"按钮

**修复**：移除这两个按钮，只保留"操作"下拉菜单（包含"异动"和"离职"选项）

## 修复内容

### 后端修改

**文件**：`backend/src/modules/hr/hr.service.ts`

1. **修复历史版本数据返回逻辑**（第1789-1934行）：
   - 将通过 `employeeChangeLog` 回溯改为直接从 `WorkInfoHistory` 表读取
   - 确保返回完整的数据结构，包含 `currentWorkInfo` 字段
   - 返回员工基本信息、学历、工作经历、家庭成员等完整数据

### 数据库修复

**执行修复**：运行脚本修复当前版本设置

```bash
cd backend
npx ts-node fix-employee-work-info.ts
```

**修复逻辑**：
1. 重置所有工作信息历史的 `isCurrent` 为 `false`
2. 找出生效日期 <= 今天 的最新记录
3. 将该记录设置为 `isCurrent: true`

### 前端修改

**文件**：`frontend/src/pages/hr/EmployeeDetailPage.tsx`

1. **移除顶部按钮**（第2220-2339行）：
   - 移除"更正"按钮
   - 移除"更新"按钮
   - 保留"操作"下拉菜单

## 修复结果

### 当前版本设置

```
修复前：
  2025-01-01 (ENTRY) - isCurrent=false
  2026-04-15 (TRANSFER) - isCurrent=true ← 当前版本 ❌

修复后：
  2025-01-01 (ENTRY) - isCurrent=true ← 当前版本 ✅
  2026-04-15 (TRANSFER) - isCurrent=false
```

### 数据验证

```
员工: Aaron.he (202604001)
员工工号: 202604001
员工入职日期: 2025-01-01

当前版本生效日期: 2025-01-01
今天日期: 2026-04-09
✅ 当前版本设置正确（生效日期 <= 今天）

历史版本数据：✅ 正常加载并显示
工号字段：✅ 从 Employee 表正确获取
入职日期字段：✅ 从 Employee 表正确获取
```

## 注意事项

### 当前版本判断逻辑

```typescript
// 正确的当前版本判断逻辑
const today = new Date();
today.setHours(0, 0, 0, 0);

let shouldBeCurrent = null;

// 从最新到最旧查找
for (let i = workInfoHistories.length - 1; i >= 0; i--) {
  const effectiveDate = new Date(workInfoHistories[i].effectiveDate);
  effectiveDate.setHours(0, 0, 0, 0);

  if (effectiveDate <= today) {
    shouldBeCurrent = workInfoHistories[i];
    break;
  }
}

// 如果没找到，使用最早的记录
if (!shouldBeCurrent && workInfoHistories.length > 0) {
  shouldBeCurrent = workInfoHistories[0];
}
```

### 数据读取优先级

1. **员工基本信息字段**（employeeNo, entryDate等）：
   - 始终从 `Employee` 表读取
   - 不随工作信息版本变化

2. **工作信息字段**（position, jobLevel, orgId等）：
   - 从 `currentWorkInfo.currentWorkInfo` 读取
   - 随版本变化

3. **自定义字段**：
   - 合并 `Employee.customFields` 和 `WorkInfoHistory.customFields`
   - `WorkInfoHistory` 的优先级更高

## 后续优化建议

1. **创建异动时的校验**：
   - 在创建异动时，检查生效日期是否在今天或之后
   - 如果生效日期在未来，不应更新当前版本

2. **当前版本自动维护**：
   - 考虑使用数据库触发器或定时任务
   - 自动更新 `isCurrent` 标记

3. **历史版本查询优化**：
   - 添加索引 `(employeeId, effectiveDate, isCurrent)`
   - 优化查询性能

4. **前端数据展示优化**：
   - 清楚标识当前版本和历史版本
   - 未来版本显示特殊标记
