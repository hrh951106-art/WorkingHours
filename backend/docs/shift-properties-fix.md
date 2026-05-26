# 班次属性保���后消失问题 - 修复说明

## 问题描述

在系统配置-班次管理中编辑班次，给班次挂载属性保存后，再打开班次时属性消失不见。

## 问题原因

经过测试分析，后端API完全正常，问题出在前端的React Query缓存机制上：

1. **后端API验证**：通过完整的API测试确认：
   - ✅ 属性保存成功
   - ✅ 数据库存储正确
   - ✅ 查询API返回正确
   - ✅ 响应格式符合预期

2. **前端缓存问题**：
   - React Query默认会缓存查询结果
   - 当用户重新打开编辑页面时，使用的是旧的缓存数据（空数组）
   - `invalidateQueries`只是标���数据为过期，不会立即重新查询
   - 页面导航时机可能在数据刷新之前

## 修复方案

修改文件：`/Users/aaron.he/Desktop/AI/JY/frontend/src/pages/shift/ShiftEditPage.tsx`

### 1. 强制每次挂载时重新查询（第51-58行）

```typescript
// 获取班次详情（仅编辑模式）
const { data: shiftData, isLoading } = useQuery({
  queryKey: ['shift', id],
  queryFn: () => request.get(`/shift/shifts/${id}`).then((res: any) => res),
  enabled: isEdit,
  staleTime: 0, // 始终使用最新数据
  refetchOnMount: 'always', // ✅ 每次挂载都重新查询
  gcTime: 0, // ✅ 不保留缓存
});
```

### 2. 强制属性查询总是获取最新数据（第66-76行）

```typescript
// 获取当前班次的属性（仅编辑模式）
const { data: shiftProperties = [], refetch: refetchProperties } = useQuery({
  queryKey: ['shiftProperties', id],
  queryFn: () =>
    request.get(`/shift/shifts/${id}/properties`).then((res: any) => {
      console.log('[ShiftEdit] 查询班次属性返回:', res);
      return res || [];
    }),
  enabled: isEdit,
  staleTime: 0, // 始终使用最新数据
  refetchOnMount: 'always', // ✅ 每次挂载都重新查询
  gcTime: 0, // ✅ 不保留缓存
});
```

### 3. 保存后强制刷新并等待完成（第107-126行）

```typescript
onSuccess: async () => {
  message.success(isEdit ? '更新成功' : '创建成功');

  // ✅ 使用refetchQueries强制立即重新查询并等待完成
  await queryClient.refetchQueries({ queryKey: ['shifts'] });
  await queryClient.refetchQueries({ queryKey: ['shiftProperties'] });

  // 只在编辑模式下重新查询详情
  if (isEdit) {
    await queryClient.refetchQueries({ queryKey: ['shift', id] });
    await queryClient.refetchQueries({ queryKey: ['shiftProperties', id] });
  }

  console.log('[ShiftEdit] 保存成功，已刷新所有缓存');

  // 根据当前路径判断返回路径
  const basePath = isEmbed ? '/embed/shift/shifts' : '/shift/shifts';
  navigate(basePath);
},
```

### 4. 添加调试日志（第70, 143行）

```typescript
// 查询时
console.log('[ShiftEdit] 查询班次属性返回:', res);

// useEffect中
console.log('[ShiftEdit] 初始化表单数据:', {
  shiftId: shiftData.id,
  shiftProperties,
  propertyKeys: shiftProperties?.map((p: any) => p.propertyKey) || [],
});
```

## 修复效果

修复后的行为：
1. ✅ 保存属性后，强制立即刷新所有相关查询
2. ✅ 等待刷新完成后才导航
3. ✅ 每次打开编辑页面都会重新查询最新数据
4. ✅ 不使用任何缓存，确保显示的数据总是最新的

## 关键改动说明

| 配置项 | 作用 |
|--------|------|
| `staleTime: 0` | 数据立即过期，不认为是"新鲜"的 |
| `refetchOnMount: 'always'` | 每次组件挂载时都重新查询，不管缓存是否存在 |
| `gcTime: 0` | 缓存立即被清理，不保留任何数据 |
| `refetchQueries` | 替代`invalidateQueries`，强制重新查询并等待完成 |
| `await` | 确保查询完成后才继续执行（导航） |

## 测试验证

可以通过以下步骤验证修复：
1. 打开浏览器开发者工具的Console标签
2. 打开班次编辑页面
3. 添加属性（如：A01 生产早班）
4. 保存
5. 返回列表
6. 再次打开该班次的编辑页面
7. 查看Console日志和页面显示，属性应该正确显示

Console日志应该显示：
```
[ShiftEdit] 保存成功，已刷新所有缓存
[ShiftEdit] 查询班次属性返回: [{propertyKey: "A01", ...}]
[ShiftEdit] 初始化表单数据: {propertyKeys: ["A01"]}
```

## 相关文件

- `/Users/aaron.he/Desktop/AI/JY/frontend/src/pages/shift/ShiftEditPage.tsx`
- `/Users/aaron.he/Desktop/AI/JY/backend/src/modules/shift/shift.service.ts`
- `/Users/aaron.he/Desktop/AI/JY/backend/src/modules/shift/shift.controller.ts`
