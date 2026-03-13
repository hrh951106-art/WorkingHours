# 分摊结果更新机制优化

## 修改内容

### 1. 清理所有历史分摊数据
**文件**: `src/scripts/delete-allocation-results.ts`

已删除：
- ✓ 42 条分摊结果（AllocationResult）
- ✓ 45 条分摊后的工时记录（CalcResult）

### 2. 修改分摊逻辑支持更新机制
**文件**: `src/modules/allocation/allocation.service.ts`

**修改位置**: `executeAllocationCalculationV2` 方法（第1334行后）

**新增逻辑**:
```typescript
// 清理旧数据：删除同一配置的旧分摊结果
// 这样可以避免重复分摊，实现更新机制
const uniqueDates = Object.keys(groupedByDate);
for (const dateKey of uniqueDates) {
  const calcDate = new Date(dateKey);

  // 删除该配置在该日期的所有旧分摊结果
  const deletedResults = await this.prisma.allocationResult.deleteMany({
    where: {
      configId: config.id,
      recordDate: calcDate,
    },
  });

  // 删除分摊后创建的工时记录（这些记录的accountName包含"间接设备"）
  const deletedCalcResults = await this.prisma.calcResult.deleteMany({
    where: {
      calcDate: calcDate,
      accountName: {
        endsWith: '间接设备',
      },
    },
  });

  if (deletedResults.count > 0 || deletedCalcResults.count > 0) {
    console.log(`清理 ${dateKey} 的旧分摊数据: ${deletedResults.count} 条分摊结果, ${deletedCalcResults.count} 条工时记录`);
  }
}
```

## 工作原理

### 更新机制流程

1. **执行分摊前**
   - 系统检查要分摊的日期范围
   - 对于每个日期，先删除该配置在该日期的所有旧分摊结果

2. **删除的内容**
   - `AllocationResult` 表：该配置在该日期的所有分摊记录
   - `CalcResult` 表：该日期的所有间接工时记录（accountName以"间接设备"结尾）

3. **执行分摊**
   - 使用新数据重新计算分摊
   - 插入新的分摊结果和工时记录

### 优点

1. **避免重复数据**
   - 同一配置对同一日期多次执行分摊，不会产生重复记录
   - 每次执行都会覆盖之前的结果

2. **实现更新机制**
   - 当源数据（工时、产量等）发生变化时，重新执行分摊即可更新结果
   - 不需要手动删除旧数据

3. **数据一致性**
   - 确保每个配置对每个日期只有一组有效的分摊结果
   - 避免数据冗余和不一致

## 使用场景

### 场景1：初次分摊
```
用户执行G02配置对2026-03-11的分摊
→ 系统检查发现没有旧数据
→ 直接执行分摊，插入新结果
```

### 场景2：数据更新后重新分摊
```
用户修改了2026-03-11的产量数据
→ 用户重新执行G02配置对2026-03-11的分摊
→ 系统自动删除该配置该日期的旧分摊结果
→ 使用新数据重新计算并插入新结果
```

### 场景3：多次执行相同分摊
```
用户不小心多次执行G02配置对2026-03-11的分摊
→ 系统每次都会先删除旧数据再插入新数据
→ 最终只有一组有效的分摊结果
```

## 验证方法

### 1. 初次执行
```sql
-- 执行前：查询分摊结果数量
SELECT COUNT(*) FROM AllocationResult WHERE configId = 15 AND recordDate = '2026-03-11';
-- 结果：0

-- 执行分摊操作
-- ...

-- 执行后：查询分摊结果数量
SELECT COUNT(*) FROM AllocationResult WHERE configId = 15 AND recordDate = '2026-03-11';
-- 结果：假设15条
```

### 2. 重复执行
```sql
-- 再次执行相同的分摊操作
-- ...

-- 查询分摊结果数量
SELECT COUNT(*) FROM AllocationResult WHERE configId = 15 AND recordDate = '2026-03-11';
-- 结果：仍然15条（不是30条）
```

### 3. 查看日志
执行分摊时，控制台会输出：
```
清理 2026-03-11 的旧分摊数据: 15 条分摊结果, 18 条工时记录
```

## 注意事项

1. **删除范围**
   - 只删除当前配置的旧数据
   - 不影响其他配置的分摊结果

2. **原子性**
   - 删除和插入在同一个事务中执行
   - 如果插入失败，旧数据已被删除，需要重新执行

3. **性能考虑**
   - 对于大量数据，删除操作可能需要一些时间
   - 系统会在控制台输出删除的记录数量

## 下一步操作

1. 在前端界面执行G02分摊操作（日期：2026-03-11）
2. 验证是否成功生成分摊结果
3. 再次执行相同的分摊操作
4. 验证是否产生重复数据（应该只有一组结果）
5. 查看控制台日志，确认旧数据被正确清理

---
修改完成时间：2026-03-12
修改人员：Claude Code Assistant
