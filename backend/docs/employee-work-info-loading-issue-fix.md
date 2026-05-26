# 人员详情工作信息页签一直提示"正在加载中"问题修复

## 问题描述

在人员详情页面的工作信息页签中，一直显示"正在加载工作信息..."提示，无法正常显示数据。

## 问题原因

经过排查，发现根本原因是：**员工缺少当前工作信息历史记录**（`isCurrent: true` 的 WorkInfoHistory 记录）。

### 技术细节

1. **前端加载逻辑**（EmployeeDetailPage.tsx）：
   ```tsx
   // 获取当前工作信息
   const { data: currentWorkInfo } = useQuery({
     queryKey: ['workInfo', id, selectedWorkInfoVersion],
     queryFn: () => request.get(`/hr/employees/${id}/work-info/current`)
   });

   // 渲染时检查数据源
   const dataSource = currentWorkInfo?.currentWorkInfo;

   <Spin spinning={!dataSource && isWorkInfo}>
     {!dataSource && isWorkInfo ? (
       <div>正在加载工作信息...</div>
     ) : ...}
   </Spin>
   ```

2. **后端API逻辑**（hr.service.ts）：
   ```typescript
   // 获取当前生效的工作信息历史
   const currentWorkInfo = await this.prisma.workInfoHistory.findFirst({
     where: {
       employeeId,
       isCurrent: true,  // 查找 isCurrent=true 的记录
     },
   });

   // 返回数据
   return {
     ...employee,
     currentWorkInfo: currentWorkInfo ? {...currentWorkInfo} : null,
   };
   ```

3. **问题根源**：
   - 员工表中没有 `isCurrent: true` 的 WorkInfoHistory 记录
   - 导致 API 返回 `currentWorkInfo: null`
   - 前端判断 `!dataSource` 为真，显示加载中提示

## 数据库分析结果

```
=== 检查员工工作信息历史记录 ===

总员工数: 3
有当前工作信息的员工数: 0
缺少当前工作信息的员工数: 3

⚠️  发现 3 个员工缺少当前工作信息！
```

## 解决方案

### 1. 创建修复脚本

创建 `fix-employee-work-info.ts` 脚本，自动为缺少当前工作信息的员工创建记录：

```typescript
async function fixEmployeeWorkInfo() {
  for (const employee of employees) {
    // 检查是否已有当前工作信息
    const existing = await prisma.workInfoHistory.findFirst({
      where: { employeeId: employee.id, isCurrent: true }
    });

    if (existing) continue;

    // 如果有历史记录，将最新的设置为当前
    const histories = await prisma.workInfoHistory.findMany({
      where: { employeeId: employee.id },
      orderBy: { effectiveDate: 'desc' }
    });

    if (histories.length > 0) {
      await prisma.workInfoHistory.update({
        where: { id: histories[0].id },
        data: { isCurrent: true }
      });
    } else {
      // 创建默认的当前工作信息
      await prisma.workInfoHistory.create({
        data: {
          employeeId: employee.id,
          effectiveDate: employee.entryDate || new Date(),
          changeType: 'ENTRY',
          orgId: employee.orgId,
          isCurrent: true,
        }
      });
    }
  }
}
```

### 2. 运行修复脚本

```bash
cd backend
npx ts-node fix-employee-work-info.ts
```

### 3. 修复结果

```
=== 修复完成 ===
修复员工数: 3
跳过员工数: 0

=== 验证修复结果 ===
总员工数: 3
有当前工作信息的员工数: 3

✅ 所有员工都已有当前工作信息！
```

### 4. 最终验证

```
✅ 张三 (EMP001): 当前工作信息有 (异动类型: ENTRY, 生效日期: 2023-01-01)
✅ 李四 (EMP002): 当前工作信息有 (异动类型: ENTRY, 生效日期: 2023-03-01)
✅ Aaron.he (202604001): 当前工作信息有 (异动类型: ENTRY, 生效日期: 2025-01-01)

✅ 验证结果: 所有员工都正常
```

## 预防措施

为防止以后出现类似问题，已在 `createEmployee` 方法中确保：

1. **创建员工时自动创建工作信息历史**：
   ```typescript
   // 即使没有工作信息，也创建一个默认的工作信息历史
   await this.prisma.workInfoHistory.create({
     data: {
       employeeId: employee.id,
       effectiveDate: employee.entryDate || new Date(),
       changeType: 'ENTRY',
       orgId: employee.orgId,
       isCurrent: true,
     },
   });
   ```

2. **创建员工时的逻辑**（hr.service.ts: 472-482）：
   - 如果有工作信息数据，创建完整的工作信息历史
   - 如果没有工作信息数据，创建默认的工作信息历史
   - 确保 `isCurrent: true` 始终被设置

## 相关文件

- `backend/fix-employee-work-info.ts` - 修复脚本
- `backend/src/modules/hr/hr.service.ts` - HR服务，包含员工创建逻辑
- `frontend/src/pages/hr/EmployeeDetailPage.tsx` - 员工详情页面

## 注意事项

1. **生产环境**：在生产环境使用修复脚本前，建议先备份数据库
2. **定期检查**：可以定期运行检查脚本，确保所有员工都有当前工作信息
3. **数据一致性**：确保 WorkInfoHistory 表中每个员工至少有一条 `isCurrent: true` 的记录
