# 开线维护表结构更新总结

## 更新目��
优化开线维护的数据存储结构，支持存储完整的劳动力账户信息，同时按照 WH1001 配置存储对应层级的组织信息。

## 表结构变更

### 新增字段
| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| accountId | INTEGER | 产线劳动力账户ID | 123 |
| accountName | TEXT | 产线��动力账户名称（完整路径） | "大华富阳工厂/W1总装车间/W1总装车间L1产线" |
| accountPath | TEXT | 产线劳动力账户路径（code路径） | "FAC001/WS001/WL001" |

### 字段含义调整
| 字段名 | 原含义 | 新含义 |
|--------|--------|--------|
| orgId | 产线组织ID | WH1001配置的最高层级的组织ID（如配置"1,2,3"，则存储层级1工厂的ID） |
| orgName | 产线组织名称 | WH1001配置的最高层级的组织名称 |

## 数据存储逻辑

### 示例场景
**WH1001 配置**: "1,2,3" （工厂、车间、产线）

**用户选择**: 大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶/焊接

**存储数据**:
```
orgId: 1          (工厂层级ID)
orgName: "大华富阳工厂"  (工厂层级名称)
accountId: 456    (完整劳动力账户ID)
accountName: "大华富阳��厂/W1总装车间/W1总装车间L1产线"  (完整账户路径)
accountPath: "FAC001/WS001/WL001"  (完整账户code路径)
```

## 实施内容

### 1. 数据库迁移
**文件**: `backend/prisma/migrations/add-account-fields-to-lineshift.sql`

```sql
-- 添加劳动力账户相关字段
ALTER TABLE LineShift ADD COLUMN accountId INTEGER;
ALTER TABLE LineShift ADD COLUMN accountName TEXT;
ALTER TABLE LineShift ADD COLUMN accountPath TEXT;

-- 创建索引
CREATE INDEX LineShift_accountId_idx ON LineShift(accountId);
```

### 2. Prisma Schema 更新
**文件**: `backend/prisma/schema.prisma`

```prisma
model LineShift {
  id                      Int       @id @default(autoincrement())
  orgId                   Int       // WH1001配置的最高层级的组织ID
  orgName                 String    // WH1001配置的最高层级的组织名称
  accountId               Int?      // 产线劳动力账户ID
  accountName             String?   // 产线劳动力账户名称（完整路径）
  accountPath             String?   // 产线劳动力账户路径（code路径）
  // ... 其他字段

  @@index([accountId])
}
```

### 3. 前端提交逻辑更新
**文件**: `frontend/src/pages/allocation/LineMaintenancePage.tsx`

**关键逻辑**:
```tsx
// 获取 WH1001 配置的可选层级
const wh1001Config = systemConfigs?.find((c: any) => c.configKey === 'WH1001');
const selectableLevelIds = wh1001Config?.configValue
  ? wh1001Config.configValue.split(',').map((id: string) => parseInt(id.trim()))
  : [];

// 从账户的 hierarchyValues 中找到 WH1001 配置的最高层级
const hierarchyValues = JSON.parse(account.hierarchyValues);
const orgLevels = hierarchyValues
  .filter((hv: any) => hv.mappingType === 'ORG' || hv.mappingType === 'ORG_TYPE')
  .sort((a: any, b: any) => a.level - b.level);

// 在WH1001配置的层级中，找到最高层级（level最小的）
for (const levelId of selectableLevelIds.sort((a: number, b: number) => a - b)) {
  const matchedLevel = orgLevels.find((hv: any) => hv.level === levelId);
  if (matchedLevel?.selectedValue?.id) {
    orgId = matchedLevel.selectedValue.id;
    orgName = matchedLevel.selectedValue.name;
    break;
  }
}
```

### 4. 前端显示逻辑更新
**表格列定义**:
```tsx
{
  title: '产线组织',  // 显示WH1001配置的最高层级
  dataIndex: 'orgName',
  width: 150,
  render: (name: string) => name || '-',
},
{
  title: '产线账户',  // 显示完整的账户路径
  dataIndex: 'accountName',
  width: 250,
  ellipsis: true,
  render: (name: string, record: LineRecord) => name || record.orgName || '-',
}
```

### 5. 后端 API 更新
**文件**: `backend/src/modules/allocation/allocation.service.ts`

**createLineShift 方法**:
```typescript
async createLineShift(dto: any) {
  const {
    orgId,
    orgName,
    accountId,      // 新增
    accountName,    // 新增
    accountPath,    // 新增
    // ... 其他字段
  } = dto;

  return this.prisma.lineShift.create({
    data: {
      orgId,
      orgName,
      accountId,
      accountName,
      accountPath,
      // ... 其他字段
    },
  });
}
```

**updateLineShift 方法**:
```typescript
async updateLineShift(id: number, dto: any) {
  const {
    orgId,
    orgName,
    accountId,      // 新增
    accountName,    // 新增
    accountPath,    // 新增
    // ... 其他字段
  } = dto;

  return this.prisma.lineShift.update({
    where: { id },
    data: {
      ...(orgId !== undefined && { orgId }),
      ...(orgName !== undefined && { orgName }),
      ...(accountId !== undefined && { accountId }),
      ...(accountName !== undefined && { accountName }),
      ...(accountPath !== undefined && { accountPath }),
      // ... 其他字段
    },
  });
}
```

## 数据兼容性

### 旧数据处理
- 已存在的���录：`accountId`, `accountName`, `accountPath` 字段为 NULL
- 兼容性：前端显示时优先使用 `accountName`，如果为空则回退到 `orgName`

### 迁移脚本（可选）
如果需要为旧数据填充账户信息：
```sql
UPDATE LineShift
SET accountId = orgId,
    accountName = orgName
WHERE accountId IS NULL;
```

## 用户体验改进

### 1. 信息更清晰
- **产线组织列**: 显示WH1001配置的最高层级（如工厂），方便快速识别
- **产线账户列**: 显示完整路径（如工厂/车间/产线），提供详细信息

### 2. 灵活性
- 支持按不同层级进行数据分析和统计
- 保留了完整的劳动力账户信息，便于后续扩展

### 3. 向后兼容
- 旧数据可以继续正常显示
- 新字段为可选，不影响现有功能

## 测试建议

### 功能测试
1. ✅ 新增开线记录，验证数据正确存储
2. ✅ 编辑开线记录，验证数据正确更新
3. ✅ 查看开线记录列表，验证显示正确
4. ✅ 按产线组织过滤，验证查询功能

### 数据验证
```sql
-- 查看新字段是否正确存储
SELECT
  id,
  orgId,
  orgName,
  accountId,
  accountName,
  accountPath
FROM LineShift
LIMIT 10;
```

### 兼容性测试
1. ✅ 旧数据记录是否正常显示
2. ✅ 编辑旧数据时是否正常工作
3. ✅ 删除记录时是否正常（软删除）

## 扩展性

### 修改 WH1001 配置
只需更新系统配置，无需修改代码：
```sql
UPDATE SystemConfig
SET configValue = '1,2'
WHERE configKey = 'WH1001';
```

### 添加新的账户维度
未来可以基于 `accountId` 进行更多分析：
- 按账户统计工时
- 按账户分摊费用
- 账户维度报表

## 注意事项
1. ✅ 数据库迁移已执行
2. ✅ Prisma Client 已重新生成
3. ✅ 前端已编译成功
4. ⚠️ 如果有旧数据，建议执行数据迁移脚本
5. ⚠️ 生产环境部署前请备份数据库
