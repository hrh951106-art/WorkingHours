# 分摊范围功能使用指南

## 功能概述

本功能实现了分摊范围的层级提取、开线计划表匹配、WH1001层级解析等功能，用于处理间接工时分摊时的范围匹配逻辑。

## 核心功能

### 1. 从账户名称中提取指定层级的值

**功能描述**：从账户名称中提取指定层级的值，用于确定分摊范围。

**账户名称格式**：`大华富阳工厂/W2总装车间/-/大桶/-/-/-`

**层级说明**：
- level 1: 工厂（第1段）
- level 2: 车间（第2段）
- level 3: 线体（第3段）
- level 4: 工序（第4段）
- level 5: 产品（第5段）
- level 6: 其他（第6段）
- level 7: 其他（第7段）

**API 接口**：
```
GET /allocation/scope/extract-level
```

**请求参数**：
- `accountName`: 账户名称，如 "大华富阳工厂/W2总装车间/-/大桶/-/-/-"
- `level`: 层级（1-7）

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/extract-level?accountName=大华富阳工厂/W2总装车间/-/大桶/-/-/-&level=2"
```

**返回结果**：
```json
{
  "accountName": "大华富阳工厂/W2总装车间/-/大桶/-/-/-",
  "level": 2,
  "value": "W2总装车间"
}
```

### 2. 批量提取多个层级的值

**API 接口**：
```
GET /allocation/scope/extract-multiple-levels
```

**请求参数**：
- `accountName`: 账户名称
- `levels`: 要提取的层级，用逗号分隔，如 "1,2,3,4"

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/extract-multiple-levels?accountName=大华富阳工厂/W2总装车间/-/大桶/-/-/-&levels=1,2,3,4"
```

**返回结果**：
```json
{
  "accountName": "大华富阳工厂/W2总装车间/-/大桶/-/-/-",
  "levels": [1, 2, 3, 4],
  "values": {
    "1": "大华富阳工厂",
    "2": "W2总装车间",
    "3": null,
    "4": "大桶"
  }
}
```

### 3. 获取账户名称的完整层级信息

**API 接口**：
```
GET /allocation/scope/hierarchy
```

**请求参数**：
- `accountName`: 账户名称

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/hierarchy?accountName=大华富阳工厂/W2总装车间/-/大桶/-/-/-"
```

**返回结果**：
```json
{
  "full": "大华富阳工厂/W2总装车间/-/大桶/-/-/-",
  "levels": {
    "1": "大华富阳工厂",
    "2": "W2总装车间",
    "3": null,
    "4": "大桶",
    "5": null,
    "6": null,
    "7": null
  },
  "levelCount": 7
}
```

### 4. 在开线计划表中匹配指定层级的数据

**功能描述**：基于层级值在开线计划表中查找匹配的记录。

**API 接口**：
```
GET /allocation/scope/match-line-shifts
```

**请求参数**：
- `level`: 层级（1-7）
- `levelValue`: 该层级的值
- `scheduleDate`: 计划日期（可选）
- `shiftId`: 班次ID（可选）
- `status`: 状态（可选，默认 "ACTIVE"）

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/match-line-shifts?level=2&levelValue=W2总装车间&scheduleDate=2024-05-18"
```

**返回结果**：
```json
[
  {
    "id": 1,
    "orgId": 123,
    "orgName": "W2总装车间",
    "accountId": 456,
    "accountName": "大华富阳工厂/W2总装车间/产线A/工序B/产品C/-/-",
    "shiftId": 1,
    "shiftName": "白班",
    "scheduleDate": "2024-05-18T00:00:00.000Z",
    "participateInAllocation": true,
    "status": "ACTIVE"
  }
]
```

### 5. 从开线计划记录中解析 WH1001 配置的层级值

**功能描述**：从开线计划记录中提取 WH1001 配置的层级值。

**API 接口**：
```
GET /allocation/scope/extract-wh1001
```

**请求参数**：
- `lineShiftId`: 开线计划记录 ID
- `targetLevel`: 目标层级（可选，如果不指定则返回 orgName）

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/extract-wh1001?lineShiftId=1&targetLevel=2"
```

**返回结果**：
```json
{
  "lineShiftId": 1,
  "targetLevel": 2,
  "value": "W2总装车间"
}
```

### 6. 检查开线计划记录是否应该参与分摊

**API 接口**：
```
GET /allocation/scope/participating
```

**请求参数**：
- `lineShiftId`: 开线计划记录 ID

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/participating?lineShiftId=1"
```

**返回结果**：
```json
{
  "lineShiftId": 1,
  "participate": true
}
```

### 7. 完整的分摊范围匹配流程

**功能描述**：这是最核心的功能，整合了所有步骤：
1. 从源账户名称中提取指定层级的值
2. 在开线计划表中匹配该层级的数据
3. 从匹配的记录中解析 WH1001 配置的层级
4. 过滤出应该参与分摊的记录

**API 接口**：
```
GET /allocation/scope/match
```

**请求参数**：
- `sourceAccountName`: 源账户名称（待分摊工时）
- `allocationScopeLevel`: 分摊范围层级（1-7）
- `scheduleDate`: 计划日期（可选）
- `shiftId`: 班次ID（可选）
- `status`: 状态（可选）
- `wh1001TargetLevel`: WH1001 目标层级（可选）

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/match?sourceAccountName=大华富阳工厂/W2总装车间/-/大桶/-/-/-&allocationScopeLevel=2&scheduleDate=2024-05-18&wh1001TargetLevel=2"
```

**返回结果**：
```json
[
  {
    "id": 1,
    "orgId": 123,
    "orgName": "W2总装车间",
    "accountId": 456,
    "accountName": "大华富阳工厂/W2总装车间/产线A/工序B/产品C/-/-",
    "shiftId": 1,
    "shiftName": "白班",
    "scheduleDate": "2024-05-18T00:00:00.000Z",
    "participateInAllocation": true,
    "status": "ACTIVE"
  }
]
```

### 8. 根据分摊范围配置获取匹配的开线计划记录

**功能描述**：基于 AccountHierarchyConfig 配置自动获取层级并进行匹配。

**API 接口**：
```
GET /allocation/scope/match-by-config
```

**请求参数**：
- `allocationScopeId`: 分摊范围配置 ID（来自 AccountHierarchyConfig）
- `sourceAccountName`: 源账户名称
- `scheduleDate`: 计划日期（可选）
- `shiftId`: 班次ID（可选）
- `status`: 状态（可选）

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/match-by-config?allocationScopeId=2&sourceAccountName=大华富阳工厂/W2总装车间/-/大桶/-/-/-&scheduleDate=2024-05-18"
```

### 9. 获取账户层级配置列表

**API 接口**：
```
GET /allocation/scope/hierarchy-levels
```

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/hierarchy-levels"
```

**返回结果**：
```json
[
  {
    "id": 1,
    "level": 1,
    "name": "工厂",
    "mappingType": "ORG_TYPE",
    "mappingValue": "FACTORY",
    "sort": 1,
    "status": "ACTIVE"
  },
  {
    "id": 2,
    "level": 2,
    "name": "车间",
    "mappingType": "ORG_TYPE",
    "mappingValue": "WORKSHOP",
    "sort": 2,
    "status": "ACTIVE"
  }
]
```

### 10. 根据层级获取对应的组织类型

**API 接口**：
```
GET /allocation/scope/org-type-by-level
```

**请求参数**：
- `level`: 层级（1-7）

**示例**：
```bash
curl "http://localhost:3000/allocation/scope/org-type-by-level?level=2"
```

**返回结果**：
```json
{
  "level": 2,
  "orgType": "WORKSHOP"
}
```

## 使用示例

### 完整的分摊流程示例

假设有以下场景：
- 待分摊工时账户名称：`大华富阳工厂/W2总装车间/-/大桶/-/-/-`
- 分摊范围配置：选择"车间"（level=2）
- 需要将工时分摊到该车间下的所有产线

**步骤 1：提取分摊范围值**
```bash
curl "http://localhost:3000/allocation/scope/extract-level?accountName=大华富阳工厂/W2总装车间/-/大桶/-/-/-&level=2"
```
返回：`"W2总装车间"`

**步骤 2：在开线计划表中匹配**
```bash
curl "http://localhost:3000/allocation/scope/match?sourceAccountName=大华富阳工厂/W2总装车间/-/大桶/-/-/-&allocationScopeLevel=2&scheduleDate=2024-05-18"
```

返回该车间下所有应该参与分摊的产线记录。

**步骤 3：在分摊计算中使用**
在执行分摊计算时，使用步骤2返回的产线记录作为分摊目标。

## 工具函数使用

如果需要在代码中使用这些功能，可以直接导入工具函数：

```typescript
import {
  extractLevelFromAccountName,
  matchLineShiftsByLevel,
  matchAllocationScope,
} from './src/common/utils/allocation-scope.utils';

// 提取层级
const workshopName = extractLevelFromAccountName(
  '大华富阳工厂/W2总装车间/-/大桶/-/-/-',
  2
);
// 返回: "W2总装车间"

// 匹配开线计划
const matched = matchAllocationScope(
  '大华富阳工厂/W2总装车间/-/大桶/-/-/-',
  2,
  lineShifts,
  2
);
```

## 测试

运行测试脚本验证功能：

```bash
cd backend
npx ts-node test-allocation-scope.ts
```

## 注意事项

1. **占位符处理**：账户名称中的 "-" 表示该层级为空，提取时会返回 null
2. **层级范围**：层级必须在 1-7 之间
3. **分摊标记**：只有 `participateInAllocation = true` 的开线计划记录才会被包含在分摊结果中
4. **日期过滤**：建议在查询时指定 `scheduleDate` 以提高查询效率
5. **WH1001 配置**：WH1001 配置的层级信息存储在 `orgId` 和 `orgName` 字段中

## 相关文件

- 工具类：`backend/src/common/utils/allocation-scope.utils.ts`
- 服务类：`backend/src/modules/allocation/allocation-scope.service.ts`
- 控制器：`backend/src/modules/allocation/allocation.controller.ts`
- 测试脚本：`backend/test-allocation-scope.ts`
