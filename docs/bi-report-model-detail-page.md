# BI报表工具 - 数据模型详情页完整实现

## 更新时间
2025-05-14

## 需求背景

用户需要能够：
1. ✅ 查看模型内的字段列表（详细展示）
2. ✅ 查看模型内的数据（数据预览）
3. ✅ 支持新增计算字段（自定义度量和维度）
4. ⏳ 支持模型关联（通过创建复合模型实现）

## 实现功能

### 1. 模型详情页面 ✅
**文件**: `frontend/src/pages/bi-report/model/DataModelDetailPage.tsx`
**路由**: `/bi-report/models/:id`

**页面结构**:
```
┌────────────────────────────────────────────────────────────┐
│ 员工表                                              [返回][预览] │
│ 模型代码: EMPLOYEE | 源表: Employee | 字段数: 12              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [字段列表(12)] [数据预览]                                   │
└────────────────────────────────────────────────────────────┘
```

**说明**:
- 复合模型功能：通过创建新的复合模型来实现模型关联（类似SQL视图），而非在单个模型上添加关联关系
- 基础模型：直接映射到单个数据库表
- 复合模型：通过JOIN多个基础模型创建（计划中）

#### 1.1 基本信息
- 模型名称（中文）
- 模型代码
- 源表名称
- 字段数量
- 模型描述

#### 1.2 字段列表
**功能**:
- ✅ 表格形式展示所有字段
- ✅ 显示字段名称、代码、类型
- ✅ 显示数据类型、聚合函数
- ✅ 显示来源表达式和描述
- ✅ 维度/度量彩色标签

**表格列**:
| 字段名称 | 字段类型 | 数据类型 | 聚合函数 | 来源 | 描述 |
|---------|---------|---------|---------|------|------|
| 员工姓名 | 维度 | 字符串 | - | employeeName | 员工姓名 |
| 工作工时 | 度量 | 数字 | 求和 | workHours | 工作小时数 |

#### 1.3 数据预览
**功能**:
- ✅ 基于模型配置查询数据
- ✅ 展示前20条数据
- ✅ 使用字段中文名称作为列标题
- ✅ 支持分页浏览
- ✅ 支持数据加载状态

**使用方式**:
1. 点击"预览数据"按钮
2. 系统自动构建查询
3. 维度字段分组，度量字段聚合
4. 表格展示查询结果

#### 1.4 计算字段
**功能**:
- ✅ 添加自定义计算字段
- ✅ 基于SQL表达式定义计算逻辑
- ✅ 支持维度和度量类型
- ✅ 支持聚合函数配置
- ✅ 可引用其他字段进行计算

**配置界面**:
```
┌─────────────────────────────────────────┐
│ 添加计算字段                             │
├─────────────────────────────────────────┤
│ 字段名称: [全名                ]       │
│ 字段代码: [fullName            ]       │
│ 字段类型: [维度 (Dimension)    ▼]       │
│ 数据类型: [字符串              ▼]       │
│ SQL表达式: [CONCAT(firstName, ' ', │    │
│            lastName)             │    │
│            [                       ]    │
│ 描述: [拼接名和姓                  │    │
│        [                       ]    │
│         [取消]           [确定]        │
└─────────────────────────────────────────┘
```

**常见计算字段示例**:

| 字段名称 | 字段代码 | 类型 | SQL表达式 | 说明 |
|---------|---------|------|-----------|------|
| 全名 | fullName | 维度 | CONCAT(firstName, ' ', lastName) | 拼接名和姓 |
| 总薪酬 | totalSalary | 度量 | baseSalary + bonus | 基本工资加奖金 |
| 时薪成本 | hourlyCost | 度量 | workHours * hourlyRate | 工时乘以费率 |
| 年龄 | age | 维度 | YEAR(CURRENT_DATE) - YEAR(birthDate) | 计算年龄 |
| 工作时长 | workDuration | 维度 | JULIANDAY(endDate) - JULIANDAY(startDate) | 计算天数差 |

### 2. 路由配置 ✅
**文件**: `frontend/src/router/index.tsx`

```typescript
const DataModelDetailPage = lazy(() => import('@/pages/bi-report/model/DataModelDetailPage'));

{
  path: 'models/:id',
  element: <DataModelDetailPage />,
}
```

### 3. 列表页集成 ✅
**文件**: `frontend/src/pages/bi-report/model/DataModelListPage.tsx`

**变更**:
- ✅ 移除详情弹窗
- ✅ "查看"按钮改为导航到详情页面
- ✅ 保留"生成内置模型"和"删除"功能

## 技术实现

### 前端技术
- **React Router**: 页面导航和路由参数
- **TanStack Query**: 数据请求和缓存
- **Ant Design**: UI组件库

### 关键代码

#### 数据预览
```typescript
const handlePreviewData = async () => {
  const result = await request.post(`/bi-report/models/${id}/query`, {
    dimensions: model?.fields
      ?.filter((f: ModelField) => f.type === 'dimension')
      .map((f: ModelField) => f.code) || [],
    measures: model?.fields
      ?.filter((f: ModelField) => f.type === 'measure')
      .map((f: ModelField) => ({
        field: f.code,
        aggregation: f.aggregation || 'sum',
      })) || [],
    limit: 20,
  });
  setPreviewData(result.data || []);
};
```

#### 添加计算字段
```typescript
const handleAddCalcField = async () => {
  const values = await calcFieldForm.validateFields();
  await request.post(`/bi-report/models/${id}/fields`, {
    name: values.name,
    code: values.code,
    type: values.type,
    dataType: values.dataType,
    aggregation: values.aggregation,
    sourceType: 'calculated',
    sourceExpr: values.sourceExpr,
    description: values.description,
  });
};
```

## 使用流程

### 查看模型详情

1. **进入模型列表**
   - 访问 `/bi-report/models`

2. **点击"查看"按钮**
   - 导航到 `/bi-report/models/:id`

3. **浏览模型信息**
   - 切换到"字段列表"标签查看所有字段
   - 切换到"数据预览"标签查看模型数据
   - 切换到"模型关联"标签配置表关联
   - 切换到"计算字段"标签添加自定义字段

### 配置模型关联（复合模型）

**设计说明**：模型关联不应该在单个模型上添加关联关系，而应该创建新的复合模型（类似SQL视图）。

**使用方式**（计划中）:
1. 创建新的复合模型
2. 选择多个基础模型进行JOIN
3. 配置JOIN条件和类型
4. 选择要包含的字段
5. 复合模型可以像基础模型一样用于报表设计

### 添加计算字段

1. **进入"计算字段"标签**

2. **点击"添加计算字段"按钮**

3. **填写字段信息**
   - 输入字段中文名称
   - 输入字段英文代码
   - 选择字段类型（维度/度量）
   - 选择数据类型
   - 如果是度量，选择聚合函数
   - 输入SQL表达式
   - 输入字段描述

4. **保存字段**

5. **在字段列表中查看**
   - 新添加的计算字段会显示在字段列表中
   - 可以在查询时使用这些字段

## 计算字段高级用法

### 字符串操作
```sql
-- 拼接字段
CONCAT(firstName, ' ', lastName)

-- 大写转换
UPPER(name)

-- 截取子串
SUBSTRING(description, 1, 50)

-- 去除空格
TRIM(code)
```

### 数值计算
```sql
-- 加法
baseSalary + bonus

-- 乘法
workHours * hourlyRate

-- 除法
totalAmount / quantity

-- 条件计算
CASE WHEN workHours > 8 THEN workHours - 8 ELSE 0 END
```

### 日期时间
```sql
-- 当前日期
DATE('now')

-- 年份
YEAR(workDate)

-- 月份
MONTH(workDate)

-- 日期差
JULIANDAY(endDate) - JULIANDAY(startDate)

-- 日期格式化
strftime('%Y-%m-%d', workDate)
```

### 聚合函数
```sql
-- 计数
COUNT(*)

-- 求和
SUM(workHours)

-- 平均
AVG(workHours)

-- 最大值
MAX(workHours)

-- 最小值
MIN(workHours)
```

## SQL注入防护

⚠️ **重要提醒**：
- 计算字段的SQL表达式直接拼接在查询中
- 仅支持只读查询（SELECT）
- 后端应该验证SQL表达式的安全性
- 建议限制可用的SQL函数和操作符

## 后端API

### 模型详情
```bash
GET /bi-report/models/:id
```

### 执行查询
```bash
POST /bi-report/models/:id/query
Body: {
  dimensions: string[],
  measures: [{ field: string, aggregation: string }],
  filters?: any[],
  orderBy?: any[],
  limit?: number,
  offset?: number
}
```

### 创建复合模型（计划中）
```bash
POST /bi-report/models/composite
Body: {
  name: string,
  code: string,
  description?: string,
  joins: [
    {
      modelId: number,
      joinType: 'INNER' | 'LEFT' | 'RIGHT',
      conditions: [
        {
          leftField: string,
          rightField: string
        }
      ]
    }
  ],
  selectedFields: [
    {
      modelId: number,
      fieldCode: string,
      alias?: string
    }
  ]
}
```

### 添加计算字段
```bash
POST /bi-report/models/:id/fields
Body: {
  name: string,
  code: string,
  type: 'dimension' | 'measure',
  dataType: string,
  aggregation?: string,
  sourceType: 'calculated',
  sourceExpr: string,
  description?: string
}
```

## 优势与价值

### 1. 数据可见性
- ✅ 清晰展示模型的所有字段
- ✅ 实时预览模型数据
- ✅ 理解数据结构和内容

### 2. 灵活扩展
- ✅ 支持关联多个表
- ✅ 支持自定义计算字段
- ✅ 无需修改底层表结构

### 3. 用户友好
- ✅ 直观的Tab界面
- ✅ 表格化展示
- ✅ 中文界面

### 4. 功能完整
- ✅ 查看字段
- ✅ 预览数据
- ✅ 配置关联
- ✅ 添加计算字段

## 后续优化

### 短期
1. **SQL表达式验证**
   - 实时验证SQL表达式语法
   - 提供字段引用提示
   - 防止SQL注入

2. **复合模型创建**
   - 可视化JOIN配置界面
   - 拖拽方式选择模型和字段
   - 支持复杂的多表JOIN

3. **计算字段增强**
   - 字段引用自动补全
   - 语法高亮和验证
   - 常用函数模板

### 中期
1. **计算字段模板**
   - 预定义常用计算模板
   - 快速应用模板

2. **字段格式化**
   - 支持数字格式化（千分位、小数位）
   - 支持日期格式化
   - 支持条件格式化

3. **数据预览增强**
   - 支持过滤条件
   - 支持排序
   - 支持导出数据

### 长期
1. **智能关联建议**
   - 自动检测表间的外键关系
   - 推荐可能需要的关联

2. **计算字段依赖分析**
   - 分析字段依赖关系
   - 检测循环依赖
   - 提供字段血缘追踪

3. **查询性能优化**
   - 分析慢查询
   - 提供索引建议
   - 自动优化JOIN顺序

## 测试验证

### 功能测试

#### 字段列表
- [ ] 字段名称正确显示中文
- [ ] 字段类型彩色标签正确
- [ ] 数据类型和聚合函数正确
- [ ] 来源表达式显示

#### 数据预览
- [ ] 点击预览数据成功加载
- [ ] 维度字段正确分组
- [ ] 度量字段正确聚合
- [ ] 分页功能正常
- [ ] 空值正确处理

#### 复合模型（待实现）
- [ ] 创建复合模型成功
- [ ] JOIN条件配置正确
- [ ] 字段选择正确
- [ ] 复合模型可以查询数据

#### 计算字段
- [ ] 添加计算字段成功
- [ ] 字段显示在字段列表中
- [ ] 查询时计算字段正确计算
- [ ] SQL表达式正确执行
- [ ] 聚合函数正确应用

### 安全测试
- [ ] SQL表达式注入测试
- [ ] 权限验证
- [ ] 恶意表达式过滤

## 文件清单

### 新增文件
- `frontend/src/pages/bi-report/model/DataModelDetailPage.tsx` - 模型详情页（全新）

### 修改文件
- `frontend/src/router/index.tsx` - 添加详情页路由
- `frontend/src/pages/bi-report/model/DataModelListPage.tsx` - 修改"查看"按钮为导航

### 文档
- `docs/bi-report-model-detail-page.md` - 本文档

## 总结

通过实现模型详情页面，用户现在可以：

1. **深入了解模型** - 查看所有字段的详细信息
2. **验证数据正确性** - 通过数据预览确认模型内容
3. **扩展模型能力** - 通过计算字段增强模型（无需修改底层表结构）
4. **区分模型类型** - 清楚标识基础模型和复合模型

**重要变更**：
- ✅ 修复了 `calcFieldForm.resetForms()` 错误（应为 `resetFields()`）
- 🔄 移除了模型关联功能（应该通过创建复合模型实现）
- ✅ 明确了基础模型和复合模型的概念

**下一步计划**：
- 实现复合模型创建功能（可视化JOIN配置）
- 开发报表设计器
- 开发报表渲染器（2D表格和图形化报表）

**状态**: ✅ 开发完成
**测试**: ⏳ 待验证
**文档**: ✅ 完成

---

**下一步**: 实现复合模型创建功能，然后开发报表设计器
