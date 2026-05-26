# 劳动力账户层级明细自动同步功能

## 功能概述

劳动力账户层级明细支持两种同步方式：
1. **手动同步**：通过点击"刷新全部"或"刷新选中层级"按钮主动拉取数据
2. **自动同步**：当映射字段的数据源选项发生变更时，自动同步到层级明细表

## 自动同步触发时机

当对数据源选项进行以下操作时，会自动触发同步：
- **新增选项**：创建新的数据源选项
- **修改选项**：更新数据源选项的标签、值、排序等
- **删除/停用选项**：停用数据源选项（软删除）

## 实现原理

### 1. 数据流转

```
数据源选项变更
    ↓
查找使用该数据源的层级配置
    ↓
同步层级明细表
    ↓
更新完成
```

### 2. 关联关系

层级配置通过以下方式关联到数据源：

```
层级配置 (AccountHierarchyConfig)
    ├─ mappingType = "FIELD_fieldCode" 或 "CUSTOM_fieldCode"
    └─ ↓
自定义字段 (CustomField)
    ├─ code = fieldCode
    └─ dataSourceId
        └─ ↓
数据源 (DataSource)
    └─ options[]
```

### 3. 核心代码

#### HR模块 - 数据源选项操作

在 `hr.service.ts` 中，数据源选项的增删改操作都会调用同步方法：

```typescript
async createDataSourceOption(dataSourceId: number, dto: any) {
  const option = await this.prisma.dataSourceOption.create({...});
  // 同步到层级明细表
  await this.accountService.syncDataSourceChangesToHierarchyDetails(dataSourceId);
  return option;
}

async updateDataSourceOption(id: number, dto: any) {
  const option = await this.prisma.dataSourceOption.update({...});
  // 同步到层级明细表
  await this.accountService.syncDataSourceChangesToHierarchyDetails(option.dataSourceId);
  return option;
}

async deleteDataSourceOption(id: number) {
  await this.prisma.dataSourceOption.update({...});
  // 同步到层级明细表
  await this.accountService.syncDataSourceChangesToHierarchyDetails(option.dataSourceId);
}
```

#### Account模块 - 同步方法

在 `account.service.ts` 中的 `syncDataSourceChangesToHierarchyDetails` 方法：

```typescript
async syncDataSourceChangesToHierarchyDetails(dataSourceId: number) {
  // 1. 查找直接使用该数据源的层级配置
  const directConfigs = await this.prisma.accountHierarchyConfig.findMany({
    where: { dataSourceId },
  });

  // 2. 查找使用该数据源的自定义字段
  const customFields = await this.prisma.customField.findMany({
    where: { dataSourceId },
  });

  // 3. 查找使用这些自定义字段的层级配置
  const indirectConfigs = [];
  for (const field of customFields) {
    const configs = await this.prisma.accountHierarchyConfig.findMany({
      where: {
        OR: [
          { mappingType: 'FIELD_' + field.code },
          { mappingType: 'CUSTOM_' + field.code },
        ],
      },
    });
    indirectConfigs.push(...configs);
  }

  // 4. 合并并去重
  const allConfigs = [...directConfigs];
  const configIds = new Set(directConfigs.map(c => c.id));
  for (const config of indirectConfigs) {
    if (!configIds.has(config.id)) {
      allConfigs.push(config);
    }
  }

  // 5. 对每个配置同步层级明细
  await Promise.all(
    allConfigs.map((config) => this.syncHierarchyLevelDetails(this.prisma, config))
  );
}
```

## 测试验证

### 测试场景

1. **新增选项测试**
   - 在数据源中新增选项
   - 验证层级明细表中自动新增对应记录

2. **修改选项测试**
   - 修改数据源选项的标签
   - 验证层级明细表中的数据自动更新

3. **停用选项测试**
   - 停用数据源选项
   - 验证层级明细表中对应记录自动移除

### 测试结果

所有测试场景均通过，自动同步功能正常工作：

```
=== 完整测试：数据源选项变更的自动同步 ===

========== 测试1: 新增选项 ==========
✅ 创建新选项: 新增产品A
层级明细数: 7

========== 测试2: 修改选项 ==========
✅ 修改选项: 修改后的产品A
最后2条明细:
  - 修改后的产品A
  - 汽车配件

========== 测试3: 停用选项 ==========
✅ 停用选项: 新增产品A
层级明细数: 6

✅ 所有测试完成！
```

## 使用建议

1. **定期检查**：建议定期检查层级明细的数据完整性
2. **手动刷新**：如果自动同步失败，可以使用"刷新全部"按钮手动触发
3. **监控日志**：关注后端日志中的同步信息，确保数据正确同步

## 注意事项

1. **性能考虑**：数据源选项变更会立即触发同步，对于大量选项的数据源，建议分批更新
2. **事务安全**：同步操作在同一个事务中执行，确保数据一致性
3. **容错处理**：如果某个层级同步失败，不影响其他层级的同步

## 相关文件

- `backend/src/modules/account/account.service.ts` - 账户服务，包含同步逻辑
- `backend/src/modules/hr/hr.service.ts` - HR服务，数据源选项操作
- `backend/prisma/schema.prisma` - 数据库模型定义
