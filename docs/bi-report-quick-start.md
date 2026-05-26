# BI报表工具 - 快速开始指南

## 访问入口

报表工具已经集成到系统中，可以通过以下方式访问：

### 方式1：通过顶部菜单

1. 登录系统后，在顶部导航栏找到 **"BI报表"** 按钮
2. 点击展开子菜单���
   - **数据源管理** - 浏览和管理数据库表
   - **数据模型** - 创建和管理数据模型
   - **报表管理** - 创建和管理BI报表

### 方式2：直接访问URL

- **数据源管理**: `http://localhost:5173/bi-report/datasource`
- **数据模型**: `http://localhost:5173/bi-report/models`
- **报表管理**: `http://localhost:5173/bi-report/reports`

## 功能模块

### 1. 数据源管理

**功能：**
- 查看所有数据库表
- 查看表结构（字段、类型、主键、索引）
- 预览表数据（前20条）
- 搜索表

**使用步骤：**
1. 进入"数据源管理"页面
2. 在列表中浏览所有表
3. 点击"结构"按钮查看表的详细结构
4. 点击"数据预览"按钮查看表中的数据

### 2. 数据模型管理

**功能：**
- 创建数据模型（从表导入）
- 配置模型字段（维度/度量）
- 设置字段聚合方式
- 配置表关联关系
- 执行模型查询

**使用步骤：**
1. 进入"数据模型"页面
2. 点击"创建模型"按钮
3. 选择源表，配置模型基本信息
4. 系统自动导入表字段
5. 编辑字段属性：
   - **维度（Dimension）**：用于分组，如员工姓名、日期
   - **度量（Measure）**：用于聚合计算，如工时、产量
6. 配置关联关系（可选）
7. 保存模型

### 3. 报表管理

**功能：**
- 创建报表（表格/图表/仪表板）
- 配置数据查询
- 设置过滤条件
- 预览和发布报表

**使用步骤：**
1. 进入"报表管理"页面
2. 点击"创建报表"按钮
3. 选择数据模型
4. 配置报表：
   - 选择维度（X轴/分组）
   - 选择度量（Y轴/数值）
   - 设置过滤条件
   - 选择图表类型
5. 预览报表数据
6. 保存并发布

## 快速示例

### 示例1：创建员工工时分析报表

```
1. 数据源管理
   → 找到 "WorkHourResult" 表
   → 查看表结构和数据

2. 数据模型
   → 创建模型 "员工工时分析"
   → 选择源表 "WorkHourResult"
   → 配置字段：
     * 维度：employeeName（员工姓名）、workDate（工作日期）
     * 度量：workHours（工时）、overtimeHours（加班工时）

3. 报表管理
   → 创建报表 "员工月度工时统计"
   → 选择模型 "员工工时分析"
   → 配置：
     * 维度：employeeName, workDate（按月）
     * 度量：SUM(workHours), SUM(overtimeHours)
     * 图表类型：柱状图
   → 发布报表
```

### 示例2：创建产量统计报表

```
1. 数据源管理
   → 找到 "ProductionRecord" 表
   → 查看表结构和数据

2. 数据模型
   → 创建模型 "产量统计"
   → 选择源表 "ProductionRecord"
   → 配置字段：
     * 维度：reportDate（日期）、productCode（产品代码）
     * 度量：actualQty（实际数量）、qualifiedQty（合格数量）

3. 报表管理
   → 创建报表 "产品产量趋势"
   → 选择模型 "产量统计"
   → 配置：
     * 维度：reportDate（按天）
     * 度量：SUM(actualQty), SUM(qualifiedQty)
     * 图表类型：折线图
   → 发布报表
```

## API接口说明

### 数据源相关

```bash
# 获取所有表
GET /bi-report/datasource/tables

# 获取表结构
GET /bi-report/datasource/tables/:tableName/structure

# 预览表数据
GET /bi-report/datasource/tables/:tableName/preview?limit=20

# 搜索表
GET /bi-report/datasource/tables/search?keyword=xxx
```

### 数据模型相关

```bash
# 创建模型
POST /bi-report/models
Body: {
  "name": "模型名称",
  "code": "model_code",
  "type": "table",
  "sourceTable": "TableName",
  "description": "描述"
}

# 获取模型列表
GET /bi-report/models?page=1&pageSize=20

# 获取模型详情
GET /bi-report/models/:id

# 执行模型查询
POST /bi-report/models/:id/query
Body: {
  "dimensions": ["field1", "field2"],
  "measures": ["field3"],
  "filters": [
    { "field": "field1", "operator": "eq", "value": "xxx" }
  ],
  "orderBy": [{ "field": "field1", "direction": "ASC" }],
  "limit": 100
}
```

### 报表相关

```bash
# 创建报表
POST /bi-report/reports
Body: {
  "name": "报表名称",
  "code": "report_code",
  "modelId": 1,
  "type": "chart",
  "category": "分类",
  "config": { ... },
  "queryConfig": {
    "dimensions": ["field1"],
    "measures": ["field2"]
  }
}

# 查询报表数据
POST /bi-report/reports/:id/query
Body: {
  "filters": [...],
  "limit": 100
}

# 发布报表
POST /bi-report/reports/:id/publish

# 复制报表
POST /bi-report/reports/:id/duplicate
```

## 注意事项

1. **SQLite限制**：当前使用SQLite数据库，对于大型数据集可能存在性能限制
2. **SQL安全**：自定义SQL功能仅允许SELECT查询
3. **权限控制**：暂未实现细粒度权限控制，所有用户可访问所有报表
4. **缓存策略**：报表数据查询结果可以缓存以提高性能

## 开发计划

- [ ] 数据模型配置页面（拖拽式字段选择）
- [ ] 报表设计器（可视化配置界面）
- [ ] 报表展示页面（图表渲染）
- [ ] 导出功能（Excel、PDF）
- [ ] 定时刷新
- [ ] 数据预警
- [ ] 权限控制

## 技术支持

如有问题，请查看：
- 实现文档：`docs/bi-report-implementation-summary.md`
- API文档：后端代码中的Controller注释
- 前端代码：`frontend/src/pages/bi-report/`

---

**祝您使用愉快！** 🎉
