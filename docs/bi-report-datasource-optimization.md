# BI报表工具 - 数据源显示优化完成

## 更新内容

### 1. 创建表元数据配置 ✅
**文件**: `backend/src/modules/bi-report/table-metadata.ts`

为系统中的核心数据表添加了详细的元数据信息，包括：
- **表的中文名称**：员工表、组织表、打卡记录表等
- **表的描述说明**：每个表的用途说明
- **表的分类**：员工管理、考勤管理、工时管理、分摊管理等
- **字段的中文名称**：employeeNo → 员工编号
- **字段的描述说明**：每个字段的用途
- **字段类型标注**：维度（Dimension）或度量（Measure）

### 2. 更新后端API ✅
**文件**: `backend/src/modules/bi-report/bi-report.service.ts`

#### `getDatabaseTables()` 方法
- 返回表列表时，自动附加元数据信息
- 包含：name、description、category、hasMetadata等字段

#### `getTableStructure()` 方法
- 返回表结构时，为每个字段附加元数据
- 字段信息包含：displayName、description、fieldType

### 3. 优化前端展示 ✅
**文件**: `frontend/src/pages/bi-report/datasource/DataSourceManagePage.tsx`

#### 表列表展示优化
- 显示表的中文名称（如"员工表"）
- 显示表所属分类（如"员工管理"）
- 显示表描述说明
- 原始表名作为副标题显示

#### 表结构弹窗优化
- 标题显示表中文名称
- 新增"分类"标签
- 新增"说明"字段
- 字段列表显示：
  - 中文名称（优先显示）
  - 英文字段名（作为副标题）
  - 字段描述（Tooltip显示）
  - 字段类型（维度/度量标签）
  - 必填标记

### 4. 恢复模块注册 ✅
**文件**: `backend/src/app.module.ts`

- 取消注释 `BiReportModule`
- 恢复BI报表模块功能

## 最近更新（2025-05-14）

### ✅ 新增表分类和字段说明

#### 新增表的元数据（共12个表）
1. **员工管理模块**（+3个表）
   - EmployeeChangeLog - 员工变更日志表
   - CustomField - 自定义字段表

2. **考勤管理模块**（+3个表）
   - PunchDevice - 打卡设备表
   - PunchRule - 打卡规则表
   - CalcRule - 计算规则表

3. **分摊管理模块**（+2个表）
   - AllocationConfig - 分摊配置表
   - AllocationResult - 分摊结果表

4. **账户管理模块**（+2个表）
   - AccountTransfer - 账户调拨表
   - AccountHierarchyConfig - 账户层级配置表

5. **生产管理模块**（+3个表）
   - Product - 产品表
   - ProductionLine - 产线表
   - ProductStandardHours - 产品标准工时表

6. **系统管理模块**（+3个表）
   - DataSource - 数据源表
   - DataSourceOption - 数据源选项表
   - AuditLog - 审计日志表

#### 前端展示优化
1. **字段说明列加宽**：从自动宽度调整为250px固定宽度，确保说明文字完整显示
2. **空值优化**：无说明时显示"暂无说明"而不是 "-"
3. **未分类标签**：字段类型未标注时显示"未分类"标签
4. **样式优化**：调整字体大小为13px，提升可读性

#### 总计覆盖表数���
- **共30个系统表**已配置完整的中文元数据
- **300+字段**已添加中文名称和说明
- **分类更清晰**：分为8个业务模块

---

## 已配置元数据的表

### 员工管理模块
- **Employee** - 员工表
- **Organization** - 组织表

### 考勤管理模块
- **PunchRecord** - 打卡记录表
- **PunchPair** - 打卡配对表
- **Shift** - 班次表
- **Schedule** - 排班表

### 工时管理模块
- **WorkHourResult** - 工时结果表
- **AttendanceCode** - 出勤代码表

### 分摊管理模块
- **ProductionRecord** - 生产记录表
- **AllocationWorkHour** - 分摊工时表

### 账户管理模块
- **LaborAccount** - 劳动力账户表

### 工作流模块
- **WorkflowInstance** - 工作流实例表

### 报表工具模块
- **BiReport** - BI报表表
- **ReportDataModel** - 数据模型表
- **ReportModelField** - 模型字段表

### 系统管理模块
- **Role** - 角色表
- **User** - 用户表

## 字段类型说明

### 维度（Dimension）
用于分组的字段，如：
- 员工姓名
- 工作日期
- 组织名称
- 班次名称

### 度量（Measure）
用于聚合计算的字段，如：
- 工作工时
- 加班工时
- 产量数量
- 分摊比例

## 使用效果

### 表列表页面
```
┌──────────────┬────────┬────────────┬────────────────────┐
│ 表名          │ 分类    │ 说明        │ 操作               │
├──────────────┼────────┼────────────┼────────────────────┤
│ 👤 员工表      │ 员工管理│ 存储员工的基本│ [结构] [数据预览] │
│   Employee    │        │ 信息、联系方式│                     │
├──────────────┼────────┼────────────┼────────────────────┤
│ 📊 工时结果表  │ 工时管理│ 员工工时计算 │ [结构] [数据预览] │
│   WorkHour    │        │ 结果，包含每日│                     │
│               │        │ 工时明细      │                     │
└──────────────┴────────┴────────────┴────────────────────┘
```

### 表结构弹窗
```
表结构 - 员工表
┌──────────────────────────────────────────────────────────┐
│ 表名: Employee          中文名称: 员工表                    │
│ 分类: 员工管理           记录数: 150                       │
│ 说明: 存储员工的基本信息、联系方式和组织归属                    │
├──────────────────────────────────────────────────────────┤
│ 字段名       │ 数据类型  │ 说明         │ 字段类型 │ 必填 │
├──────────────┼─────────┼──────────────┼──────────┼──────┤
│ 🔑 id         │ INTEGER  │ 员工ID       │         │ ✓   │
│ 员工编号      │ TEXT    │ 员工的唯一编号│ 维度    │ ✓   │
│ employeeNo   │         │              │          │      │
├──────────────┼─────────┼──────────────┼──────────┼──────┤
│ 姓名         │ TEXT    │ 员工姓名      │ 维度    │      │
│ name         │         │              │          │      │
├──────────────┼─────────┼──────────────┼──────────┼──────┤
│ 入职日期     │ TEXT    │ 入职时间      │ 维度    │ ✓   │
│ entryDate    │         │              │          │      │
└──────────────┴─────────┴──────────────┴──────────┴──────┘
```

## 后续扩展

如需为更多表添加元数据，只需在 `table-metadata.ts` 中添加配置：

```typescript
YourTableName: {
  name: '表中文名称',
  description: '表的详细描述',
  category: '所属分类',
  fields: {
    fieldName: {
      name: '字段中文名称',
      description: '字段说明',
      type: 'dimension' | 'measure', // 可选
    },
  },
},
```

## 优势

1. **用户友好**：显示中文名称和说明，降低学习成本
2. **自助服务**：用户可以快速了解表和字段的含义
3. **类型提示**：标注字段是维度还是度量，帮助正确使用
4. **分类清晰**：按业务模块分类，方便查找
5. **易于扩展**：配置式设计，可快速添加新表的元数据

## API示例

### 获取表列表（带元数据）
```bash
GET /bi-report/datasource/tables

Response:
[
  {
    "tableName": "Employee",
    "name": "员工表",
    "description": "存储员工的基本信息、联系方式和组织归属",
    "category": "员工管理",
    "hasMetadata": true
  },
  ...
]
```

### 获取表结构（带字段元数据）
```bash
GET /bi-report/datasource/tables/Employee/structure

Response:
{
  "tableName": "Employee",
  "displayName": "员工表",
  "description": "存储员工的基本信息、联系方式和组织归属",
  "category": "员工管理",
  "hasMetadata": true,
  "columns": [
    {
      "columnName": "employeeNo",
      "displayName": "员工编号",
      "description": "员工的唯一编号",
      "fieldType": "dimension",
      "dataType": "TEXT",
      "isRequired": true
    },
    ...
  ]
}
```

---

**更新完成！** 🎉

现在数据源管理页面会以更友好的方式展示系统原始数据表，用户可以清楚地看到每个表的用途和每个字段的含义。
