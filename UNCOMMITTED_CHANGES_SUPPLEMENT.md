# 未提交修改补充说明 - 2025年6月9日

## 重要提示
本文档补充说明**截至2025年6月9日尚未提交但已修改**的代码内容。这些修改需要在部署前提交或单独处理。

**修改文件总数**: 161个
**修改代码行数**: +7153/-3195
**状态**: 已修改未提交 (工作区)

---

## 一、数据库Schema变更 (未提交)

### 1.1 数据库Provider切换

**文件**: `backend/prisma/schema.prisma`

**变更内容**:
```prisma
# 本地开发环境
datasource db {
  provider = "sqlite"  # 从postgresql改回sqlite（本地开发）
  url      = env("DATABASE_URL")
}
```

**说明**:
- 这是**本地开发环境**的配置
- 生产环境应保持 `provider = "postgresql"`
- 部署时需要手动确认或使用环境特定配置

### 1.2 新增模型关系

**ProductStandardHourByLevel模型**:
```prisma
model ProductStandardHourByLevel {
  // ... 现有字段

  // 新增产品关系
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, effectiveDate, expiryDate, status])
}
```

**Product模型**:
```prisma
model Product {
  // ... 现有字段

  // 新增关系
  productStandardHourByLevels ProductStandardHourByLevel[]
}
```

### 1.3 新增字段

**LaborHourReportEmployee**:
```prisma
model LaborHourReportEmployee {
  // 新增员工独立工时字段
  startTime   String?   // 员工独立开始时间 (HH:mm)
  endTime     String?   // 员工独立结束时间 (HH:mm)
  value       Float?    // 员工独立工时数量
  description String?   // 员工独立描述
}
```

**PersonalProductionRecord**:
```prisma
model PersonalProductionRecord {
  unit String? @default("小时")  // 新增单位字段
}
```

**EarnedHoursAllocationResult**:
```prisma
model EarnedHoursAllocationResult {
  unit String?  // 新增单位字段
}
```

**ProductStandardHourByLevel**:
```prisma
model ProductStandardHourByLevel {
  unit String?  // 新增单位字段
}
```

**AllocationRuleConfig**:
```prisma
model AllocationRuleConfig {
  ruleCode String?  // 新增规则代码字段
}
```

---

## 二、前端新增页面和路由 (未提交)

### 2.1 新增页面组件

**新增页面文件**:
1. `frontend/src/pages/allocation/EarnedHoursReportPage.tsx` - 赚取工时报表页面
2. `frontend/src/pages/allocation/ProductMaintenancePage.tsx` - 产品维护页面

### 2.2 新增路由配置

**文件**: `frontend/src/router/index.tsx`

**新增路由**:
```tsx
// 赚取工时报表路由
{
  path: 'earned-hours-report',
  element: <EarnedHoursReportPage />,
},

// 产品维护路由
{
  path: 'product-maintenance',
  element: <ProductMaintenancePage />,
},
```

---

## 三、后端服务层修改 (未提交)

### 3.1 核心服务文件修改清单

**分摊服务**:
- `backend/src/modules/allocation/allocation.service.ts` (MM)
- `backend/src/modules/allocation/allocation.controller.ts` (MM)
- `backend/src/modules/allocation/allocation-scope.service.ts` (M)

**工时管理**:
- `backend/src/modules/allocation/earned-hours-allocation.service.ts` (MM)
- `backend/src/modules/allocation/earned-hours-allocation.controller.ts` (MM)
- `backend/src/modules/labor-hour-report/labor-hour-report.service.ts` (MM)
- `backend/src/modules/labor-hour-report/dto/create-request.dto.ts` (MM)

**人事服务**:
- `backend/src/modules/hr/hr.service.ts` (MM)
- `backend/src/modules/hr/hr.controller.ts` (M)
- `backend/src/modules/hr/employee-info-tab.service.ts` (M)
- `backend/src/modules/hr/dto/employee.dto.ts` (M)

**计算服务**:
- `backend/src/modules/calculate/calculate.service.ts` (M)
- `backend/src/modules/calculate/calculate.controller.ts` (M)
- `backend/src/modules/calculate/attendance-work-hour.service.ts` (M)

**工作流服务**:
- `backend/src/modules/workflow/workflow-instance.service.ts` (MM)

### 3.2 通用服务修改

- `backend/src/common/utils/allocation-scope.utils.ts` (M) - 分摊范围工具
- `backend/src/common/guards/permissions.guard.ts` (M) - 权限守卫
- `backend/src/common/interceptors/transform.interceptor.ts` (M) - 转换拦截器
- `backend/src/database/prisma.service.ts` (MM) - Prisma数据库服务

---

## 四、前端组件和页面修改 (未提交)

### 4.1 组件修改

**通用组件**:
- `frontend/src/components/common/OrganizationTreeSelect.tsx` - 组织树选择组件重构 (+404行)
- `frontend/src/components/common/DynamicSearchConditions.tsx` - 动态搜索条件组件 (+61行)

### 4.2 页面修改

**分摊管理页面**:
- `frontend/src/pages/allocation/ProductStandardHoursConfigPage.tsx` - 重构 (-945/+945行)
- `frontend/src/pages/allocation/AllocationConfigPage.tsx` - 分摊配置页面优化 (+90行)
- `frontend/src/pages/allocation/AllocationResultPage.tsx` - 分摊结果页面优化 (+53行)
- `frontend/src/pages/allocation/LineMaintenancePage.tsx` - 产线维护页面 (+156行)

**工时汇报页面**:
- `frontend/src/pages/labor-hour-report/LaborHourReportCreatePage.tsx` - 大幅重构 (+792行)
- `frontend/src/pages/labor-hour-report/LaborHourReportDetailPage.tsx` - 详情页面优化 (+172行)

**人事管理页面**:
- `frontend/src/pages/hr/EmployeeListPage.tsx` - 员工列表页面 (+41行)
- `frontend/src/pages/hr/EmployeeCreatePage.tsx` - 员工创建页面

**仪表板页面**:
- `frontend/src/pages/DashboardPage.tsx` - 工作台页面优化

---

## 五、部署前处理建议

### 5.1 数据库配置处理

**问题**: Schema文件中provider被改为sqlite（本地开发）

**解决方案**:
1. **方案一**: 提交前改回postgresql
   ```bash
   # 编辑 backend/prisma/schema.prisma
   # 将 provider = "sqlite" 改为 provider = "postgresql"
   ```

2. **方案二**: 使用分支管理
   ```bash
   # 创建生产环境分支
   git checkout -b production
   # 在生产分支中保持postgresql配置
   ```

3. **方案三**: 使用环境变量控制
   ```prisma
   # 在schema.prisma中使用条件配置（如果Prisma支持）
   ```

### 5.2 新增关系和字段迁移

**需要生成的迁移脚本**:
1. ProductStandardHourByLevel与Product的关系
2. LaborHourReportEmployee的新字段
3. PersonalProductionRecord的unit字段
4. EarnedHoursAllocationResult的unit字段
5. ProductStandardHourByLevel的unit字段
6. AllocationRuleConfig的ruleCode字段

**操作步骤**:
```bash
cd backend

# 1. 确保provider设置为postgresql
# 2. 生成迁移
npx prisma migrate dev --name add_unit_fields_and_product_relation

# 3. 验证迁移SQL
npx prisma migrate status

# 4. 部署到生产
npx prisma migrate deploy
```

### 5.3 新增页面部署

**前端新页面**:
1. `EarnedHoursReportPage.tsx` - 赚取工时报表
2. `ProductMaintenancePage.tsx` - 产品维护

**后端接口检查**:
- 确认后端已实现相应的API接口
- 验证接口权限和参数

### 5.4 大规模重构文件处理

**重点验证文件**:
1. `ProductStandardHoursConfigPage.tsx` - 重构幅度大
2. `LaborHourReportCreatePage.tsx` - 重构幅度大
3. `OrganizationTreeSelect.tsx` - 组件重构

**建议**:
1. 逐个文件进行代码审查
2. 完整的回归测试
3. 性能测试（特别是重构后的页面）

---

## 六、快速部署检查

### 必须立即处理 (P0)

- [ ] **数据库provider**: 确认为postgresql
- [ ] **生成数据库迁移**: 新关系和字段
- [ ] **测试迁移脚本**: 在开发环境验证

### 高优先级 (P1)

- [ ] **新增页面功能测试**: EarnedHoursReportPage、ProductMaintenancePage
- [ ] **重构页面回归测试**: ProductStandardHoursConfigPage、LaborHourReportCreatePage
- [ ] **API接口验证**: 所有新增的接口

### 中优先级 (P2)

- [ ] **组件重构测试**: OrganizationTreeSelect
- [ ] **样式和交互验证**: 用户体验一致性
- [ ] **性能测试**: 重构后的页面性能

---

## 七、建议的提交和部署流程

### 步骤1: 整理和提交未提交修改

```bash
# 1. 查看所有修改
git status

# 2. 按模块分别提交
git add backend/prisma/schema.prisma
git commit -m "feat: 添加产品关系和单位字段支持"

git add backend/src/modules/allocation/
git commit -m "feat: 优化分摊服务和相关功能"

git add frontend/src/pages/allocation/
git commit -m "feat: 新增赚取工时报表和产品维护页面"

git add frontend/src/pages/labor-hour-report/
git commit -m "refactor: 重构工时汇报页面"

# 3. 推送到远程
git push origin main
```

### 步骤2: 生成数据库迁移

```bash
cd backend

# 确保provider为postgresql
# 然后生成迁移
npx prisma migrate dev --name june_9_updates
```

### 步骤3: 测试验证

- [ ] 开发环境完整测试
- [ ] 数据库迁移验证
- [ ] 新功能功能测试
- [ ] 性能测试

### 步骤4: 生产部署

按照主文档 `JUNE_2025_DEPLOYMENT_SUMMARY.md` 的部署流程执行

---

## 八、风险评估

### 高风险变更

1. **数据库Provider混淆**
   - 风险: 本地sqlite配置可能被部署到生产
   - 影响: 数据库连接失败
   - 缓解: 严格配置检查

2. **大规模页面重构**
   - 风险: ProductStandardHoursConfigPage、LaborHourReportCreatePage
   - 影响: 功能异常、用户体验下降
   - 缓解: 充分的回归测试

3. **新数据库关系**
   - 风险: Product关系、新增字段
   - 影响: 数据一致性、约束错误
   - 缓解: 完整的数据迁移测试

### 中风险变更

1. **新增页面和路由**
   - 风险: EarnedHoursReportPage、ProductMaintenancePage
   - 影响: 新功能可用性
   - 缓解: 功能测试、接口验证

2. **组件重构**
   - 风险: OrganizationTreeSelect、DynamicSearchConditions
   - 影响: 多页面联动影响
   - 缓解: 组件单元测试

---

## 九、时间估算

| 任务 | 预计时间 |
|------|---------|
| 整理和提交未提交修改 | 1-2小时 |
| 生成数据库迁移 | 30分钟 |
| 开发环境测试 | 2-3小时 |
| 生产环境部署 | 3-5小时 |
| 总计 | 6.5-10.5小时 |

**建议**: 分两天进行
- Day 1: 提交整理、迁移生成、开发测试
- Day 2: 生产部署、验证测试

---

**文档生成时间**: 2025年6月9日
**状态**: 未提交修改分析完成
**下一步**: 按建议流程提交和部署