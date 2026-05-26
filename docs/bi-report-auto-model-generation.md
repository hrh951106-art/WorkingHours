# BI报表工具 - 自动生成内置模型功能

## 更新时间
2025-05-14

## 需求变更

**原需求**：用户手动选择数据源表，配置字段创建数据模型

**新需求**：系统自动基于数据源表生成内置的通用模型，无需手动配置

## 变更内容

### 1. 移除的功能
- ❌ 手动创建模型功能
- ❌ 模型编辑页面（保留但不在界面展示）
- ❌ SQL和API类型支持（仅保留table类型）
- ❌ 手动选择和配置字段

### 2. 新增的功能
- ✅ **自动生成内置模型**：一键生成所有配置了元数据的表的模型
- ✅ **智能字段识别**：基于表元数据自动识别维度和度量
- ✅ **批量导入**：自动导入表的所有字段
- ✅ **中文友好**：使用表的中文元数据作为模型名称和描述
- ✅ **跳过已存在**：如果模型已存在则跳过，不会重复生成

## 实现方案

### 后端实现

#### 1. 增强字段导入（集成元数据）
**文件**: `backend/src/modules/bi-report/data-model.service.ts`

```typescript
private async importTableFields(tableName: string): Promise<any[]> {
  const columns = await this.prisma.$queryRaw`
    SELECT name as columnName, type as dataType, [notnull] as isRequired
    FROM pragma_table_info(${tableName})
    ORDER BY cid
  `;

  const metadata = TABLE_METADATA[tableName];

  const fields = (columns as any[]).map((column, index) => {
    const columnMeta = metadata?.fields[column.columnName];
    const dataType = this.mapDataType(column.dataType);

    // 优先使用元数据中的字段类型，否则自动推断
    let fieldType = columnMeta?.type || this.inferFieldType(column.columnName, dataType);

    return {
      name: columnMeta?.name || column.columnName,      // 中文名称
      code: column.columnName,                           // 英文代码
      type: fieldType,                                   // 维度/度量
      dataType: dataType,
      sourceType: 'column',
      sourceExpr: column.columnName,
      aggregation: fieldType === 'measure' ? 'sum' : null,
      description: columnMeta?.description,              // 字段描述
      sortNo: index,
    };
  });

  return fields;
}
```

**特点**：
- 优先使用表元数据中的中文名称和描述
- 优先使用元数据中的字段类型标注
- 智能推断字段类型（维度/度量）
- 自动设置聚合函数

#### 2. 批量生成内置模型
```typescript
async generateBuiltinModels() {
  const results = {
    success: [] as string[],
    failed: [] as string[],
    skipped: [] as string[],
  };

  const tables = Object.keys(TABLE_METADATA);

  for (const tableName of tables) {
    try {
      // 检查模型是否已存在
      const existingModel = await this.prisma.reportDataModel.findFirst({
        where: { sourceTable: tableName, type: 'table' },
      });

      if (existingModel) {
        results.skipped.push(tableName);
        continue;
      }

      const metadata = TABLE_METADATA[tableName];

      // 生成模型代码（表名转大写下划线）
      const code = tableName
        .replace(/([A-Z])/g, '_$1')
        .toUpperCase()
        .replace(/^_/, '');

      // 创建模型
      await this.prisma.reportDataModel.create({
        data: {
          name: metadata.name,              // 使用中文表名
          code: code,                        // 自动生成的代码
          type: 'table',
          sourceTable: tableName,
          description: metadata.description, // 使用表描述
          status: 'ACTIVE',
          fields: {
            create: await this.importTableFields(tableName),
          },
        },
      });

      results.success.push(tableName);
    } catch (error: any) {
      results.failed.push(`${tableName}: ${error.message}`);
    }
  }

  return results;
}
```

#### 3. 新增API端点
**文件**: `backend/src/modules/bi-report/bi-report.controller.ts`

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/bi-report/models/generate-builtin` | POST | 批量生成内置模型 |

**请求示例**：
```bash
POST /bi-report/models/generate-builtin

Response:
{
  "success": ["Employee", "WorkHourResult", "PunchRecord", ...],
  "failed": [],
  "skipped": []
}
```

### 前端实现

#### 1. 简化模型列表页
**文件**: `frontend/src/pages/bi-report/model/DataModelListPage.tsx`

**变更**：
- 移除"创建模型"按钮
- 添加"生成内置模型"按钮（主要操作）
- 移除"编辑"按钮（只保留查看和删除）
- 添加生成模型确认弹窗

**界面效果**：
```
┌────────────────────────────────────────────────────────────┐
│ 数据模型管理                                   [⚡ 生成内置模型] │
├────────────────────────────────────────────────────────────┤
│ 搜索: [_______________] 状态: [全部▼]                       │
├────────────────────────────────────────────────────────────┤
│ 模型名称          代码      类型    源表     字段数  操作   │
├────────────────────────────────────────────────────────────┤
│ 📊 员工表        EMPLOYEE  数据表  Employee  12    [查看]  │
│                                                 [删除]     │
├────────────────────────────────────────────────────────────┤
│ ⏱️ 工时结果表    WORK_H...  数据表  WorkH...  15    [查看]  │
│                                                 [删除]     │
└────────────────────────────────────────────────────────────┘
```

#### 2. 生成模型确认弹窗
```typescript
<Modal
  title="生成内置数据模型"
  open={isGenerateModalVisible}
  onOk={() => generateMutation.mutate()}
  onCancel={() => setIsGenerateModalVisible(false)}
  confirmLoading={generateMutation.isPending}
>
  <Alert
    message="系统将基于已配置元数据的数据源表自动生成内置数据模型"
    type="info"
  />

  <ul>
    <li>自动为所有配置了元数据的表创建数据模型</li>
    <li>自动导入表字段，智能识别维度和度量</li>
    <li>使用表的中文信息作为模型名称和描述</li>
    <li>如果模型已存在，则跳过生成</li>
  </ul>
</Modal>
```

## 使用流程

### 首次使用

1. **访问数据模型管理**
   - 路径：`/bi-report/models`

2. **点击"生成内置模型"按钮**
   - 系统弹出确认对话框

3. **确认生成**
   - 系统自动为所有配置了元数据的表创建模型
   - 等待几秒钟完成

4. **查看生成结果**
   - 成功：显示生成的模型数量
   - 跳过：显示已存在的模型数量
   - 失败：显示生成失败的表及原因

5. **在列表中查看模型**
   - 模型列表显示所有内置模型
   - 可以查看模型详情和字段配置
   - 可以删除不需要的模型

### 重新生成

如果元数据有更新，需要重新生成模型：

1. 删除旧的模型（或直接重新生成，系统会跳过已存在的）
2. 点击"生成内置模型"
3. 系统会跳过已存在的模型，只生成新的

## 数据模型映射

系统会自动为以下表生成数据模型（共33个）：

### 员工管理（5个）
- Employee → 员工表（EMPLOYEE）
- Organization → 组织表（ORGANIZATION）
- EmployeeChangeLog → 员工变更日志表（EMPLOYEE_CHANGE_LOG）
- CustomField → 自定义字段表（CUSTOM_FIELD）
- WorkInfoHistory → 工作信息历史表（WORK_INFO_HISTORY）

### 考勤管理（7个）
- PunchRecord → 打卡记录表（PUNCH_RECORD）
- PunchPair → 打卡配对表（PUNCH_PAIR）
- Shift → 班次表（SHIFT）
- Schedule → 排班表（SCHEDULE）
- PunchDevice → 打卡设备表（PUNCH_DEVICE）
- PunchRule → 打卡规则表（PUNCH_RULE）
- CalcRule → 计算规则表（CALC_RULE）

### 工时管理（2个）
- WorkHourResult → 工时结果表（WORK_HOUR_RESULT）
- AttendanceCode → 出勤代码表（ATTENDANCE_CODE）

### 分摊管理（4个）
- ProductionRecord → 生产记录表（PRODUCTION_RECORD）
- AllocationConfig → 分摊配置表（ALLOCATION_CONFIG）
- AllocationResult → 分摊结果表（ALLOCATION_RESULT）
- AllocationWorkHour → 分摊工时表（ALLOCATION_WORK_HOUR）

### 账户管理（3个）
- LaborAccount → 劳动力账户表（LABOR_ACCOUNT）
- AccountTransfer → 账户调拨表（ACCOUNT_TRANSFER）
- AccountHierarchyConfig → 账户层级配置表（ACCOUNT_HIERARCHY_CONFIG）

### 生产管理（3个）
- Product → 产品表（PRODUCT）
- ProductionLine → 产线表（PRODUCTION_LINE）
- ProductStandardHours → 产品标准工时表（PRODUCT_STANDARD_HOURS）

### 报表工具（3个）
- BiReport → BI报表表（BI_REPORT）
- ReportDataModel → 数据模型表（REPORT_DATA_MODEL）
- ReportModelField → 模型字段表（REPORT_MODEL_FIELD）

### 工作流管理（1个）
- WorkflowInstance → 工作流实例表（WORKFLOW_INSTANCE）

### 系统管理（5个）
- DataSource → 数据源表（DATA_SOURCE）
- DataSourceOption → 数据源选项表（DATA_SOURCE_OPTION）
- Role → 角色表（ROLE）
- User → 用户表（USER）
- AuditLog → 审计日志表（AUDIT_LOG）

## 字段智能识别规则

### 维度字段（Dimension）
用于分组的字段，包括：

1. **元数据标注为dimension的字段**
2. **以Id结尾的字段**（如employeeId, orgId）
3. **时间相关字段**（如workDate, created_at）
4. **名称相关字段**（如name, title）
5. **文本类型字段**（TEXT, VARCHAR）
6. **日期类型字段**（DATE, DATETIME）

### 度量字段（Measure）
用于聚合计算的字段，包括：

1. **元数据标注为measure的字段**
2. **数值类型 + 包含度量关键词**：
   - amount, count, quantity, qty
   - price, cost, sum, total
   - avg, rate, ratio, percent
   - 数量, 金额, 价格, 成本
   - 总计, 合计, 平均

3. **默认聚合函数**：sum（求和）

## 优势与价值

### 1. 零配置
- ✅ 无需手动创建模型
- ✅ 无需手动配置字段
- ✅ 一键生成所有模型

### 2. 智能识别
- ✅ 自动识别维度和度量
- ✅ 自动设置聚合函数
- ✅ 使用中文元数据

### 3. 可维护性
- ✅ 集中管理元数据配置
- ✅ 元数据更新后可重新生成
- ✅ 跳过已存在的模型

### 4. 一致性
- ✅ 所有模型使用统一的命名规范
- ✅ 字段类型识别规则一致
- ✅ 中文显示友好

## 测试验证

### 功能测试

1. **首次生成**
   - [ ] 点击"生成内置模型"
   - [ ] 验证33个模型全部生成成功
   - [ ] 验证模型使用中文名称
   - [ ] 验证字段包含中文描述

2. **重复生成**
   - [ ] 第二次点击"生成内置模型"
   - [ ] 验证所有模型被跳过
   - [ ] 验证不报错、不重复

3. **增量生成**
   - [ ] 添加新的表元数据
   - [ ] 重新生成
   - [ ] 验证只生成新表
   - [ ] 验证旧表被跳过

4. **字段验证**
   - [ ] 验证维度字段识别正确
   - [ ] 验证度量字段识别正确
   - [ ] 验证聚合函数设置正确
   - [ ] 验证中文名称正确显示

5. **模型查询**
   - [ ] 使用模型查询数据
   - [ ] 验证维度分组正确
   - [ ] 验证度量聚合正确

## 后续扩展

### 可能的优化

1. **手动覆盖元数据识别**
   - 允许用户手动调整字段类型
   - 保存用户自定义配置

2. **模型版本管理**
   - 记录模型生成版本
   - 支持回滚到之前版本

3. **增量更新**
   - 只更新变化的表
   - 保留用户自定义配置

4. **模型关系**
   - 自动识别表间关系
   - 生成JOIN配置

## 文件清单

### 修改的文件
1. `backend/src/modules/bi-report/data-model.service.ts`
   - 增强importTableFields方法（集成元数据）
   - 新增generateBuiltinModels方法
   - 新增regenerateModelFields方法

2. `backend/src/modules/bi-report/bi-report.controller.ts`
   - 新增POST /models/generate-builtin端点
   - 新增POST /models/:id/regenerate-fields端点

3. `frontend/src/pages/bi-report/model/DataModelListPage.tsx`
   - 移除"创建模型"按钮
   - 添加"生成内置模型"按钮
   - 添加生成模型确认弹窗
   - 移除"编辑"按钮

### 保留的文件
- `frontend/src/pages/bi-report/model/DataModelEditPage.tsx`（保留但不使用）
- `frontend/src/router/index.tsx`（路由保留但不展示入口）

## 总结

通过这次改动，BI报表工具的数据模型管理变得更加简单和自动化：

1. **用户体验大幅提升**：从需要手动配置每个模型，变为一键生成所有模型
2. **智能化程度提高**：基于元数据自动识别字段类型，减少人工判断
3. **可维护性增强**：集中管理元数据，统一更新和生成
4. **学习成本降低**：开箱即用，无需了解技术细节

**状态**: ✅ 开发完成
**测试**: ⏳ 待验证
**文档**: ✅ 完成

---

**下一步**: 基于内置模型开发报表设计器
