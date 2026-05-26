# 开线维护 orgId 选择逻辑说明

## WH1001 配置说明

**配置值**: `"1,2,3"`
- 层级1: 工厂
- 层级2: 车间
- 层级3: 产线

这个配置表示用户在新建产线账户时，可以选择工厂、车间、产线这三个层级中的任意一个。

## orgId 存储逻辑

### 核心原则
**根据用户实际选择的最深层级来存储 orgId**

### 实现逻辑
```javascript
// 1. 获取所有组织类型的层级，按层级序号排序（从小到大）
const orgLevels = hierarchyValues
  .filter((hv) => hv.mappingType === 'ORG' || hv.mappingType === 'ORG_TYPE')
  .sort((a, b) => a.level - b.level);

// 2. 从最深层（level最大）开始向前遍历
// 3. 找到第一个在 WH1001 配置中的层级，就用那个层级的 orgId
for (let i = orgLevels.length - 1; i >= 0; i--) {
  const level = orgLevels[i];
  if (selectableLevelIds.includes(level.level) && level.selectedValue?.id) {
    orgId = level.selectedValue.id;
    orgName = level.selectedValue.name;
    break;
  }
}
```

## 示例说明

### 示例1: 用户选择完整路径
**用户选择**: 大华富阳工厂 → W1总装车间 → W1总装车间L1产线

**存储结果**:
```
orgId: 8                    (W1总装车间L1产线的组织ID，层级3)
orgName: "W1总装车间L1产线"
accountId: 456
accountName: "大华富阳工厂/W1总装车间/W1总装车间L1产线"
```

### 示例2: 用户只选择到车间
**用户选择**: 大华富阳工厂 → W1总装车间

**存储结果**:
```
orgId: 4                    (W1总装车间的组织ID，层级2)
orgName: "W1总装车间"
accountId: 123
accountName: "大华富阳工厂/W1总装车间"
```

### 示例3: 用户只选择到工厂
**用户选择**: 大华富阳工厂

**存储结果**:
```
orgId: 1                    (大华富阳工厂的组织ID，层级1)
orgName: "大华富阳工厂"
accountId: 789
accountName: "大华富阳工厂"
```

## 唯一性约束

**约束**: `orgId + shiftId + scheduleDate`

这个逻辑确保：
- 同一天同一班次，每个具体的组织（产线/车间/工厂）只能有一条记录
- 避免了"同一工厂的不同产线在同一天的同一班次"会冲突的问题

## 优势

1. **灵活性**: 用户可以选择任意深度的层级
2. **精确性**: orgId 准确反映用户选择的具体组织
3. **唯一性**: 避免不同层级的记录冲突
4. **扩展性**: 支持未来 WH1001 配置的调整

## 对比之前的错误逻辑

### ❌ 错误逻辑1: 固定取最小层级（工厂）
```javascript
// 从小到大找第一个
for (const levelId of selectableLevelIds.sort((a, b) => a - b)) {
  // 总是返回工厂的 orgId
}
```
**问题**: 同一工厂的不同产线会冲突

### ❌ 错误逻辑2: 固定取最大层级（产线）
```javascript
// 从大到小找第一个
for (const levelId of selectableLevelIds.sort((a, b) => b - a)) {
  // 总是返回产线的 orgId
}
```
**问题**: 用户如果只选到车间，仍然会返回产线的 orgId，不符合用户选择

### ✅ 正确逻辑: 根据用户选择取最深层级
```javascript
// 从用户实际选择的最深层级开始找
for (let i = orgLevels.length - 1; i >= 0; i--) {
  if (selectableLevelIds.includes(level.level) && level.selectedValue?.id) {
    // 返回用户实际选择的层级
    break;
  }
}
```
**优势**: 准确反映用户的选择意图
