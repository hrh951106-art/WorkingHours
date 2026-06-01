# 主劳动力账户生成逻辑修复 - 完成总结

## ��题描述

员工202605014（王小妹）案例：
- 只有1条任职记录（effectiveDate=2025-01-01）
- 但创建了2个主账户（账户127和账户212）
- 账户212的effectiveDate=2026-05-31（错误，不对应任何任职记录）
- 账户127的Level 7值不是最新的（Level_006而非LEVEL_008）

## 根本原因

���`regenerateAccountsForEmployee()`方法总是创建新账户，无法区分：
- 场景1：新增任职记录 → 应创建新账户
- 场景2：更新任职记录 → 应更新现有账户

## 修复方案

### 核心逻辑

```
1. 获取最新WorkInfoHistory的effectiveDate
2. 查找匹配该effectiveDate的现有账户
3. IF 找到匹配账户 → 更新该账户的hierarchyValues（保持ACTIVE）
   ELSE → 创建新账户（对应新任职记录）
```

### 修复内容

#### 1. 修改 `account.service.ts` 文件

**修改位置**：`src/modules/account/account.service.ts`

**修改的方法**：
- `regenerateAccountsForEmployee()` (lines 1471-1582)
- 新增 `calculateCompleteHierarchy()` (lines 1584-1760)

**关键修复点**：

1. **effectiveDate匹配逻辑**
   ```typescript
   const existingAccount = await this.prisma.laborAccount.findFirst({
     where: {
       employeeId,
       type: 'MAIN',
       effectiveDate: latestWorkInfo.effectiveDate,
     },
   });

   if (existingAccount) {
     // 更新现有账户
     await this.prisma.laborAccount.update({
       where: { id: existingAccount.id },
       data: {
         path: newHierarchyData.path,
         namePath: newHierarchyData.namePath,
         hierarchyValues: JSON.stringify(newHierarchyData.hierarchyValues),
       },
     });
   } else {
     // 创建新账户
     return this.generateAccountsForEmployee(employeeId);
   }
   ```

2. **修复层级值为NULL的问题**
   ```typescript
   // 合并WorkInfoHistory字段到customFields
   if (workInfoHistory) {
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

## 验证结果

### 修复前
- 账户127: INACTIVE, effectiveDate=2025-01-01, Level 7=Level_006
- 账户212: ACTIVE, effectiveDate=2026-05-31, Level 7=NULL ❌

### 修复后
- 账户127: ACTIVE, effectiveDate=2025-01-01, Level 7=LEVEL_008 ✅
- 账户212: 已删除 ✅

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

## 修改的文件

1. `src/modules/account/account.service.ts` - 核心修复
2. `fix-account-regeneration-logic.ts` - 修复实现参考
3. `ACCOUNT_REGENERATION_FIX_GUIDE.md` - 修复指南
4. `test-account-fix.ts` - 测试脚本
5. `cleanup-erroneous-accounts.ts` - 清理脚本

## 注意事项

1. **effectiveDate匹配**：精确到日期（不含时间部分）
2. **事务处理**：更新操作使用事务确保一致性
3. **层级配置**：确保Level 6-7的mappingType为'FIELD_position'和'FIELD_jobLevel'
4. **兼容性**：保持向后兼容，不影响其他功能
5. **调试日志**：添加了详细的调试日志便于排查问题

## 后续工作

- [x] 应用修复到account.service.ts
- [x] 添加calculateCompleteHierarchy()辅助方法
- [x] 验证修复逻辑正确性
- [x] 清理错误的账户212
- [x] 恢复账户127为ACTIVE状态
- [x] 更新账户127的Level 7值为LEVEL_008

## 验证命令

```bash
# 测试修复逻辑
npx tsx test-account-fix.ts

# 清理错误账户
npx tsx cleanup-erroneous-accounts.ts

# 验证最终状态
npx tsx test-fixed-logic.ts
```

## 总结

✅ 成功修复了主劳动力账户生成逻辑的问题
✅ 基于effectiveDate匹配，正确区分"创建"和"更新"场景
✅ 修复了层级值为NULL的问题（通过正确合并WorkInfoHistory字段）
✅ 清理了错误的账户数据
✅ 添加了详细的调试日志

修复后的代码已部署到生产环境，可以进行测试验证。
