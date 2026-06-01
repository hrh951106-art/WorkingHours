# 主劳动力账户生成逻辑修复指南

## 问题总结

### 当前问题
员工202605014（王小妹）案例：
- 只有1条任职记录（effectiveDate=2025-01-01）
- 但创建了2个主账户（账户127和账户212）
- 账户127的effectiveDate=2025-01-01（正确）
- 账户212的effectiveDate=2026-05-31（错误，不对应任何任职记录）

### 根本原因
当前`regenerateAccountsForEmployee()`方法总是创建新账户，无法区分：
- 场景1：新增任职记录 → 应创建新账户
- 场景2：更新任职记录 → 应更新现有账户
- 场景3：基本信息变更 → 应更新现有账户

## 修复方案：基于effectiveDate匹配

### 核心逻辑
```
1. 获取最新WorkInfoHistory的effectiveDate
2. 查找匹配该effectiveDate的现有主账户
3. IF 找到匹配账户 → 更新该账户的hierarchyValues（保持ACTIVE）
   ELSE → 创建新账户（对应新任职记录）
```

### 修复步骤

#### 步骤1：修改 `regenerateAccountsForEmployee()` 方法

**文件位置**：`src/modules/account/account.service.ts`

**替换范围**：lines 1577-1883（整个regenerateAccountsForEmployee方法）

**新方法实现**：参考 `fix-account-regeneration-logic.ts` 文件

#### 关键代码片段

```typescript
async regenerateAccountsForEmployee(employeeId: number) {
  // 1. 获取最新WorkInfoHistory
  const latestWorkInfo = await this.prisma.workInfoHistory.findFirst({
    where: {
      employeeId,
      isCurrent: true,
    },
    select: {
      id: true,
      effectiveDate: true,
      position: true,
      jobLevel: true,
    },
  });

  // 2. 查找匹配effectiveDate的现有账户
  const existingAccount = await this.prisma.laborAccount.findFirst({
    where: {
      employeeId,
      type: 'MAIN',
      effectiveDate: latestWorkInfo.effectiveDate,
    },
  });

  if (existingAccount) {
    // 更新现有账户
    const newHierarchyData = await this.calculateCompleteHierarchy(employeeId);

    await this.prisma.laborAccount.update({
      where: { id: existingAccount.id },
      data: {
        path: newHierarchyData.path,
        namePath: newHierarchyData.namePath,
        hierarchyValues: JSON.stringify(newHierarchyData.hierarchyValues),
      },
    });

    return { message: '账户已更新', changed: true };
  } else {
    // 创建新账户
    return this.generateAccountsForEmployee(employeeId);
  }
}
```

#### 步骤2：修复层级值为NULL的问题

**问题原因**：WorkInfoHistory字段未正确合并到customFields

**修复位置**：`calculateCompleteHierarchy()` 方法（新增）

**关键修复**：
```typescript
// 确保WorkInfoHistory字段被正确合并
if (workInfoHistory) {
  // 合并独立字段
  const workInfoFields = {
    position: workInfoHistory.position,
    jobLevel: workInfoHistory.jobLevel,
    // ... 其他字段
  };

  for (const [fieldCode, fieldValue] of Object.entries(workInfoFields)) {
    if (fieldValue && !customFields[fieldCode]) {
      customFields[fieldCode] = fieldValue;
    }
  }
}
```

#### 步骤3：添加调试日志

```typescript
console.log(`📋 最新WorkInfoHistory: effectiveDate=${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}, position=${latestWorkInfo.position}, jobLevel=${latestWorkInfo.jobLevel}`);
console.log(`合并后的customFields:`, customFields);
console.log(`处理Level ${config.level}: fieldCode=${fieldCode}, value=${customFieldValue}`);
```

## 验证修复效果

### 修复前
- 账户127: INACTIVE, effectiveDate=2025-01-01
- 账户212: ACTIVE, effectiveDate=2026-05-31 ❌错误
- Level 7值为NULL

### 修复后
- 账户127: ACTIVE, effectiveDate=2025-01-01 ✅
- 账户212: 删除
- Level 7值: LEVEL_008 ✅

## 额外清理工作

修复后需要清理：
1. 删除所有错误的账户（effectiveDate与任职记录不匹配的账户）
2. 将正确的账户状态改回ACTIVE

### 清理脚本示例

```typescript
// 删除账户212
await prisma.laborAccount.delete({
  where: { id: 212 },
});

// 恢复账户127为ACTIVE
await prisma.laborAccount.update({
  where: { id: 127 },
  data: {
    status: 'ACTIVE',
    expiryDate: null,
  },
});
```

## 注意事项

1. **effectiveDate匹配**：精确到日期（不含时间部分）
2. **事务处理**：更新操作建议使用事务确保一致性
3. **层级配置**：确保Level 6-7的mappingType为'FIELD_position'和'FIELD_jobLevel'
4. **兼容性**：保持向后兼容，不影响其他功能

## 测试场景

### 场景1：新增任职记录
```
操作：创建新WorkInfoHistory（effectiveDate=2026-06-02）
预期：创建新的主账户（effectiveDate=2026-06-02）
```

### 场景2：更新任职记录
```
操作：更新WorkInfoHistory的jobLevel（同一条记录）
预期：更新对应主账户的hierarchyValues，不创建新账户
```

### 场景3：基本信息变更
```
操作：修改Employee的姓名或组织
预期：更新当前ACTIVE主账户的path/namePath
```
