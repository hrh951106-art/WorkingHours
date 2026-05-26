# 开线计划页面产线选择改造总结

## 需求说明
将开线计划页面（allocation/line-maintenance）新增时选择的产线改为直接新增劳动力账户的控件，要求：
1. 只显示组织层级的数据
2. 只有 SystemConfig 表中 WH1001 配置的层级值可以点击
3. **非配置层级的值需要置灰不允许点击**（例如大华富阳工厂、W1总装车间等不属于WH1001配置层级的节���）

## 实施内容

### 1. 数据库配置
**添加 WH1001 系统配置**
```sql
INSERT INTO SystemConfig (configKey, configValue, category, description, createdAt, updatedAt)
VALUES ('WH1001', '1,2,3', 'WORK_HOURS', '开线计划产线选择可选层级（工厂、车间、产线）', datetime('now'), datetime('now'));
```

**配置说明**
- `configKey`: WH1001
- `configValue`: "1,2,3" 表示可以选择层级1（工厂）、层级2（车间）、层级3（产线）
- `category`: WORK_HOURS
- `description`: 开线计划产线选择可选层级

### 2. 创建新组件 LineAccountSelect
**文件路径**: `frontend/src/components/common/LineAccountSelect.tsx`

**主要功能**:
- 基于 AccountSelect 组件，专为产线选择设计
- 只显示组织类型层级（mappingType 为 'ORG' 或 'ORG_TYPE'）
- 根据 WH1001 配置禁用不可选择的层级，并**置灰显示**
- 支持新建产线账户
- 自动带上父级层级

**核心特性**:
1. **层级禁用与置灰**: 通过查询 WH1001 配置，只有配置的层级可以选择，非配置层级置灰且不可点击
2. **组织树显示**:
   - 左侧显示完整的组织架构树
   - 不可选层级显示为灰色（#d1d5db）
   - 鼠标悬停时显示 `not-allowed` 光标
   - 点击置灰节点不会触发任何操作
3. **已选层级显示**: 右侧显示已选择的层级，清晰展示当前选择状态
4. **路径预览**: 顶部显示完整的账户路径预览
5. **可选层级提示**: 弹窗顶部显示当前配置的可选层级列表

**置灰效果实现**:
```tsx
titleRender={(nodeData: any) => {
  const isDisabled = nodeData.disabled;
  return (
    <span
      style={{
        color: isDisabled ? '#d1d5db' : undefined,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      }}
    >
      {nodeData.title}
    </span>
  );
}}
```

### 3. 修改 LineMaintenancePage
**文件路径**: `frontend/src/pages/allocation/LineMaintenancePage.tsx`

**修改内容**:
1. 导入 LineAccountSelect 组件
2. 替换查询条件和表单中的产线选择组件
3. 修改提交逻辑，将账户ID转换为组织ID
4. 删除不再需要的代码（orgTree查询、renderTreeNodes函数等）

## 当前层级配置
根据 `AccountHierarchyConfig` 表：
- 层级1: 工厂（ORG类型，mappingValue=02）
- 层级2: 车间（ORG类型，mappingValue=03）
- 层级3: 产线（ORG类型，mappingValue=04）
- 层级4: 产品（FIELD类型）
- 层级5: 工序（FIELD类型）
- 层级6: 员工类型（FIELD类型）
- 层级7: 岗位（FIELD类型）

## WH1001 配置详解
当前配置值：`"1,2,3"`

**可以选择**（正常显示，可点击）:
- 层级1：工厂（type=02）
- 层级2：车间（type=03）
- 层级3：产线（type=04）

**不可选择**（置灰显示，不可点击）:
- 层级4-7：产品、工序、员工类型、岗位（非组织类型）
- 其他不属于配置层级的组织节点

## 视觉效果说明

### 组织树中的节点状态
1. **可选节点**:
   - 颜色：正常黑色
   - 光标：pointer
   - 点击：可以选择

2. **不可选节点**:
   - 颜色：灰色（#d1d5db）
   - 光标：not-allowed
   - 点击：无响应

3. **已选层级卡片**:
   - 可选层级：白色背景（#f8fafc）
   - 不可选层级：灰色背景（#f3f4f6），边框为深灰色（#d1d5db）

### 弹窗顶部提示
显示蓝色背景提示框，清晰列出当前可选的层级：
```
可选层级：工厂、车间、产线
```

## 用户体验改进
1. **查询记录时**: 可以选择已存在的产线账户进行过滤
2. **新增记录时**:
   - 可以从已有产线账户中选择
   - 可以点击"新建产线账户"按钮创建新账户
   - 在新建对话框中，可选层级正常显示，不可选层级置灰
   - 弹窗顶部显示可选层级提示
   - 点击置灰节点不会触发任何操作
   - 尝试在已选层级中操作置灰层级时，删除按钮不显示
3. **组织树交互**:
   - 可选层级：正常黑色显示，鼠标悬停显示手型光标，可以点击选择
   - 不可选层级：置灰显示，鼠标悬停显示禁止光标，点击无效
   - 选择可选组织节点时自动带上所有父级节点

## 数据流转
1. **选择账户**: 用户选择劳动力账户（accountId）
2. **提交时**: 从账户的 hierarchyValues 中提取第一个组织类型的层级
3. **存储**: 将组织ID（orgId）和组织名称（orgName）保存到 LineShift 记录

## 扩展性
如需修改可选层级，只需更新 WH1001 配置：
```sql
UPDATE SystemConfig SET configValue = '1,2,3,4' WHERE configKey = 'WH1001';
```

前端会自动读取最新配置，无需修改代码。

## 测试建议
1. ✅ 测试选择不同层级的组织节点
2. ✅ 测试置灰节点确实无法点击
3. ✅ 测试新建产线账户功能
4. ✅ 测试保存和编辑开线记录
5. ✅ 验证可选层级提示正确显示
6. ✅ 测试查询功能是否正常

## 注意事项
1. 确保数据库中已存在 WH1001 配置
2. 确保层级配置（AccountHierarchyConfig）正确
3. 确保组织架构树数据完整
4. 前端需要重新编译才能生效
5. 置灰节点在组织树中根据 WH1001 配置动态生成
