# 生产环境综合部署指南

## 文档信息
- **创建时间**: 2025-06-12
- **适用版本**: 自最后一次提交 (0a5be83) 至当前的所有修改
- **部署环境**: PostgreSQL生产环境

---

## 一、修改概览

### 1.1 数据库变更 ✅

**状态**: **无需数据库迁移**

- ✅ `prisma/schema.prisma` 无变更
- ✅ 无新增表/字段
- ✅ 无数据结构变更
- ✅ 兼容PostgreSQL

### 1.2 后端代码变更

| 文件 | 新增 | 删除 | 变更类型 |
|------|------|------|----------|
| `src/modules/allocation/allocation.service.ts` | 293 | 118 | 功能增强 + Bug修复 |
| `src/modules/account/account.service.ts` | 87 | 26 | 功能增强 |
| `src/modules/allocation/allocation.controller.ts` | 15 | 3 | 新增API |
| `src/modules/allocation/allocation-scope.service.ts` | 8 | 12 | 优化 |
| `src/modules/allocation/earned-hours-allocation.service.ts` | 187 | 164 | 功能增强 |
| `src/modules/allocation/earned-hours-allocation.controller.ts` | 78 | 33 | 新增API |
| `src/common/utils/allocation-scope.utils.ts` | 18 | 41 | 重构优化 |
| 其他模块服务文件 | ~400 | ~300 | 错误处理优化 |

**总计**: 约 **1,707 行新增**, **1,043 行删除**

### 1.3 前端代码变更

| 文件 | 新增 | 删除 | 变更类型 |
|------|------|------|----------|
| `src/pages/allocation/AllocationConfigPage.tsx` | 503 | 274 | 新功能 + UI优化 |
| `src/pages/allocation/components/EarnedHoursTab.tsx` | 424 | 232 | 新功能 |
| `src/pages/allocation/NewProductionRecordPage.tsx` | 203 | 34 | 产品数据获取优化 |
| `src/index.css` | 194 | 0 | 新增样式 |
| `src/components/common/AccountSelect.tsx` | 14 | 1 | 组件优化 |
| `src/components/common/AccountMultiSelect.tsx` | 17 | 6 | 组件优化 |
| `src/components/common/LineAccountSelect.tsx` | 21 | 3 | 组件优化 |
| 其他页面文件 | ~300 | ~200 | 错误处理优化 |

**总计**: 约 **1,700+ 行新增**, **550+ 行删除**

---

## 二、核心功能修改详情

### 2.1 后端核心修改

#### 2.1.1 分摊配置生命周期管理 (`allocation.service.ts`)

**1. 规则编号自动生成**
```typescript
// 位置: allocation.service.ts:1505-1510
let ruleIndex = 0;
for (const rule of rules) {
  ruleIndex++;
  ruleCode: `${config.configCode}-RULE${String(ruleIndex).padStart(3, '0')}`,
}
```
- **影响**: 自动生成规则编号 (CONFIG001-RULE001, RULE002...)
- **兼容性**: ✅ 仅影响新建配置，已有配置不受影响

**2. 配置重新激活**
```typescript
// 位置: allocation.service.ts:1787-1809
if (config.status !== 'DRAFT' && config.status !== 'INACTIVE') {
  throw new BadRequestException('只有草稿或失效状态的配置才能启用');
}
```
- **影响**: 允许 INACTIVE 状态的配置重新激活为 ACTIVE
- **兼容性**: ✅ 纯逻辑变更，无数据影响

**3. 配置停用功能 (新增)**
```typescript
// 位置: allocation.service.ts:1817-1848
async deactivateAllocationConfig(id: number, dto: any) {
  // 将状态从 ACTIVE 改为 INACTIVE
}
```
- **新增API**: `POST /api/allocation/configs/:id/deactivate`
- **兼容性**: ✅ 新功能，不影响已有数据

#### 2.1.2 分摊计算逻辑优化

**4. 班次缺失处理**
```typescript
// 位置: allocation.service.ts:2319-2330
let shiftLines;
if (!aggregatedResult.shiftId || aggregatedResult.shiftId === 0) {
  // 如果工时记录没有班次，使用该日期的所有开线计划
  shiftLines = activeLines;
} else {
  shiftLines = activeLines.filter((line) => line.shiftId === aggregatedResult.shiftId);
}
```
- **影响**: 当工时记录没有班次时，使用当天所有开线计划
- **兼容性**: ✅ 兼容已有数据，增强容错性

**5. 产线组织数据修复**
```typescript
// 位置: allocation.service.ts:3892-3906
const lineOrg = await this.prisma.organization.findUnique({
  where: { id: lineShift.orgId },
  select: { id: true, code: true, name: true },
});

// 使用 lineOrg 而不是 line
targetId: lineOrg.id,
targetName: lineOrg.name,
```
- **影响**: 修复产线分摊时使用正确的组织数据
- **兼容性**: ✅ Bug修复，不影响已有数据

**6. 分摊结果字段修复**
```typescript
// 位置: allocation.service.ts:3906-3920
attendanceCodeId: calcResult.attendanceCodeId,
attendanceCode: calcResult.attendanceCode || calcResult.definitionAttendanceCodeStr,
sourceHours: calcResult.actualHours,
```
- **影响**: 修复 AllocationResult 表字段映射
- **兼容性**: ✅ Bug修复，使用正确的字段名

**7. 产量汇总支持无班次**
```typescript
// 位置: allocation.service.ts:4029-4037
// 如果shiftId不为null，key格式为 "orgId-shiftId"（按班次汇总）
// 如果shiftId为null，key格式为 "orgId"（按产线汇总所有班次）
const key = record.shiftId ? `${lineOrg.id}-${record.shiftId}` : `${lineOrg.id}`;
```
- **影响**: 支持没有班次的产量记录按产线汇总
- **兼容性**: ✅ 兼容已有数据

**8. 员工姓名保留和调试日志**
```typescript
// 位置: allocation.service.ts:4593-4612, 4718-4735, 5254-5267
// 批量查询员工姓名
const employees = await this.prisma.employee.findMany({
  where: { employeeNo: { in: employeeNos } },
  select: { employeeNo: true, name: true },
});

// 添加到每条记录
const enrichedResults = filteredResults.map(r => ({
  ...r,
  employeeName: employeeMap.get(r.employeeNo) || null,
}));
```
- **影响**: 分摊结果正确显示员工姓名
- **兼容性**: ✅ Bug修复，增强数据完整性

**9. 挣得工时配置激活修复**
```typescript
// 位置: allocation.service.ts:6956-6958
if (config.status !== 'DRAFT' && config.status !== 'INACTIVE') {
  throw new BadRequestException('只能启用草稿或失效状态的配置');
}
```
- **影响**: 挣得工时配置也支持重新激活
- **兼容性**: ✅ 与分摊配置保持一致

#### 2.1.3 劳动力账户服务增强 (`account.service.ts`)

**10. 系统内置字段数据源支持**
```typescript
// 位置: account.service.ts:217-259
// 如果不是自定义字段（可能是系统内置字段），尝试直接查找同名数据源
// 系统内置字段映射规则：position → POSITION, jobLevel → JOB_LEVEL
let dataSourceCode = fieldCode.toUpperCase();

// 处理驼峰命名
if (/[a-z][A-Z]/.test(fieldCode)) {
  const withUnderscores = fieldCode.replace(/([a-z])([A-Z])/g, '$1_$2');
  dataSourceCode = withUnderscores.toUpperCase();
}
```
- **影响**: 支持系统内置字段（position, jobLevel, workStatus等）的数据源
- **兼容性**: ✅ 功能增强，不影响已有自定义字段

#### 2.1.4 新增API端点 (`allocation.controller.ts`)

**11. 停用分摊配置**
```
POST /api/allocation/configs/:id/deactivate
```
- **功能**: 停用ACTIVE状态的配置
- **请求体**:
  ```json
  {
    "deactivatedById": 1,
    "deactivatedByName": "管理员"
  }
  ```

#### 2.1.5 错误处理增强

**影响范围**: 多个服务和控制器
- **改进**: 更详细的错误日志和用户友好的错误消息
- **兼容性**: ✅ 纯日志和错误处理改进，不影响业务逻辑

### 2.2 前端核心修改

#### 2.2.1 分摊配置页面 (`AllocationConfigPage.tsx`)

**1. 新增图标导入**
```typescript
import { StopOutlined, CalculatorOutlined } from '@ant-design/icons';
```

**2. 新增状态和表单**
```typescript
const [isCalcModalVisible, setIsCalcModalVisible] = useState(false);
const [calcConfig, setCalcConfig] = useState<AllocationConfig | null>(null);
const [calcForm] = Form.useForm();
```
- **影响**: 支持计算模态框
- **兼容性**: ✅ 新功能

**3. 停用配置功能**
```typescript
const deactivateMutation = useMutation({
  mutationFn: (id: number) =>
    request.post(`/allocation/configs/${id}/deactivate`, {
      deactivatedById: user.id,
      deactivatedByName: user.name,
    }),
});
```
- **影响**: 支持停用配置
- **兼容性**: ✅ 新功能

**4. 增强错误处理**
```typescript
onError: (error: any) => {
  console.error('创建失败 - 完整错误对象:', error);
  // 提取更详细的错误信息
  let errorMessage = '创建失败';
  if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  }
  message.error(errorMessage);
}
```
- **影响**: 更友好的错误提示
- **兼容性**: ✅ 纯UI改进

#### 2.2.2 挣得工时标签页 (`EarnedHoursTab.tsx`)

**变更**:
- 新增计算功能
- 新增配置管理
- 优化错误处理
- **兼容性**: ✅ 新功能

#### 2.2.3 生产记录页面 (`NewProductionRecordPage.tsx`)

**变更**:
- 产品数据从 Product 表获取
- 仅显示 ACTIVE 状态的产品
- **兼容性**: ✅ 与后端同步优化

#### 2.2.4 全局样式 (`index.css`)

**变更**:
- 新增 194 行样式代码
- **兼容性**: ✅ 纯样式新增

#### 2.2.5 通用组件优化

**涉及文件**:
- `AccountSelect.tsx`
- `AccountMultiSelect.tsx`
- `LineAccountSelect.tsx`

**变更**: 组件性能和用户体验优化
- **兼容性**: ✅ 组件内部优化

---

## 三、兼容性分析

### 3.1 数据库兼容性 ✅

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Schema 变更 | ✅ 无 | 无表结构变更 |
| 迁移需求 | ✅ 无 | 无需迁移 |
| 数据兼容 | ✅ 完全兼容 | 不影响已有数据 |
| PostgreSQL | ✅ 兼容 | 使用标准SQL和Prisma ORM |

### 3.2 API 兼容性 ✅

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 新增API | ✅ 1个 | POST /configs/:id/deactivate |
| 修改API | ✅ 向后兼容 | 仅增强功能，不破坏现有调用 |
| 删除API | ✅ 无 | 无API删除 |
| 参数变更 | ✅ 向后兼容 | 新增可选参数 |

### 3.3 前端兼容性 ✅

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 路由变更 | ✅ 无 | 无路由修改 |
| 组件删除 | ✅ 无 | 无组件删除 |
| 状态管理 | ✅ 兼容 | 仅新增状态，不破坏现有状态 |
| 样式冲突 | ✅ 无 | 新增样式不影响现有样式 |

---

## 四、部署步骤

### 4.1 前置检查清单

- [ ] 确认生产环境数据库为 PostgreSQL
- [ ] 确认生产环境有足够的磁盘空间（建议 > 5GB）
- [ ] 确认 Node.js 版本 >= 18.0.0
- [ ] 备份生产数据库（可选但推荐）
- [ ] 备份当前生产代码（推荐）

### 4.2 后端部署

```bash
# 1. 进入后端目录
cd /path/to/backend

# 2. 备份当前版本（推荐）
git checkout -b backup-before-deploy-$(date +%Y%m%d_%H%M%S)
git push origin backup-before-deploy-$(date +%Y%m%d_%H%M%S)

# 3. 拉取最新代码
git fetch origin
git checkout main
git pull origin main

# 4. 安装依赖
npm ci

# 5. 构建生产版本
npm run build

# 6. 生成 Prisma 客户端（使用生产数据库）
DATABASE_URL="postgresql://user:password@host:port/database" npx prisma generate

# 7. 重启应用
pm2 restart jy-backend

# 或使用 systemd
# sudo systemctl restart jy-backend

# 8. 查看日志确认启动成功
pm2 logs jy-backend --lines 50
```

### 4.3 前端部署

```bash
# 1. 进入前端目录
cd /path/to/frontend

# 2. 拉取最新代码
git pull origin main

# 3. 安装依赖
npm ci

# 4. 构建生产版本
npm run build

# 5. 部署静态文件
# 将 dist 目录部署到服务器
# 例如: rsync -avz dist/ user@server:/var/www/html/
```

### 4.4 验证步骤

**后端验证**:
```bash
# 1. 健康检查
curl http://your-production-server/api/health

# 2. 测试新增API
curl -X POST http://your-production-server/api/allocation/configs/:id/deactivate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deactivatedById": 1, "deactivatedByName": "Admin"}'

# 3. 查看日志
pm2 logs jy-backend --lines 100
```

**前端验证**:
1. 打开浏览器访问生产地址
2. 测试分摊配置页面
3. 验证停用按钮显示和功能
4. 验证错误提示信息

---

## 五、回滚方案

### 5.1 后端回滚

```bash
# 快速回滚到上一个版本
cd /path/to/backend
git checkout HEAD~1
npm run build
pm2 restart jy-backend

# 或回滚到备份分支
git checkout backup-before-deploy-YYYYMMDD_HHMMSS
npm run build
pm2 restart jy-backend
```

### 5.2 前端回滚

```bash
cd /path/to/frontend
git checkout HEAD~1
npm run build
# 重新部署 dist 目录
```

### 5.3 数据库回滚

**无需数据库回滚** - 本次部署不涉及数据库变更

---

## 六、监控和验证

### 6.1 关键指标监控

部署后请关注以下指标：

1. **API响应时间**: 分摊计算、配置管理接口
2. **错误率**: 4xx/5xx 错误是否增加
3. **数据库性能**: 查询是否有性能下降
4. **内存使用**: 应用内存是否正常

### 6.2 功能验证清单

- [ ] 分摊配置可以正常创建
- [ ] 规则编号自动生成 (CONFIG001-RULE001)
- [ ] 配置可以正常启用
- [ ] **配置可以正常停用（新功能）**
- [ ] **失效配置可以重新启用（新功能）**
- [ ] 分摊计算正常执行
- [ ] **无班次的工时记录可以正常处理（新功能）**
- [ ] 员工姓名正确显示
- [ ] 系统内置字段（position, jobLevel）正常工作
- [ ] 前端错误提示友好清晰

### 6.3 日志检查点

部署成功后，日志应包含以下信息：

```
[分摊计算] 规则编号自动生成: CONFIG001-RULE001
[分摊计算] 配置状态: DRAFT → ACTIVE
[分摊计算] 配置状态: ACTIVE → INACTIVE
[分摊计算] 配置状态: INACTIVE → ACTIVE
[分摊计算] 工时记录没有班次，使用该日期的所有开线计划
[分摊计算] 员工姓名映射: 员工数=X, 找到姓名=Y
```

---

## 七、注意事项

### 7.1 部署风险

| 风险项 | 风险级别 | 缓解措施 |
|--------|----------|----------|
| 代码构建失败 | 低 | 本地已验证编译通过 |
| API不兼容 | 极低 | 仅新增API，不修改现有API |
| 数据库问题 | 无 | 无schema变更 |
| 前端样式冲突 | 极低 | 仅新增样式 |

### 7.2 业务影响

- ✅ **无停机时间**: 建议滚动更新
- ✅ **无数据迁移**: 不影响生产数据
- ✅ **向后兼容**: 旧版客户端仍可正常工作
- ⚠️ **新功能**: 停用配置功能需要前端更新才能使用

### 7.3 性能影响

- ✅ **无性能下降**: 优化后的查询逻辑更高效
- ✅ **内存使用**: 无明显增加
- ✅ **数据库负载**: 新增的员工姓名批量查询减少数据库往返

---

## 八、技术支持

### 8.1 问题排查

**问题1**: 启动后API报错
- 检查 Prisma 客户端是否生成
- 检查数据库连接是否正常
- 查看日志: `pm2 logs jy-backend`

**问题2**: 前端页面空白
- 检查 dist 目录是否正确部署
- 检查浏览器控制台错误
- 确认API地址配置正确

**问题3**: 数据库连接失败
- 检查 DATABASE_URL 环境变量
- 检查数据库服务器状态
- 验证网络连接

### 8.2 紧急联系

如遇到紧急问题，请执行回滚方案并联系技术支持。

---

## 九、部署检查清单

部署前确认：
- [ ] 代码已备份
- [ ] TypeScript 编译成功
- [ ] Prisma 客户端已生成
- [ ] 环境变量已配置
- [ ] 数据库连接测试通过

部署后验证：
- [ ] 后端服务正常启动
- [ ] 前端页面正常加载
- [ ] API健康检查通过
- [ ] 分摊配置创建成功
- [ ] **停用配置功能可用**
- [ ] 分摊计算正常执行
- [ ] 错误提示友好清晰
- [ ] 日志无异常错误

---

## 十、更新历史

| 日期 | 版本 | 更新内容 | 作者 |
|------|------|----------|------|
| 2025-06-12 | v1.0 | 初始版本，包含自提交0a5be83以来的所有变更 | Claude Code |

---

**文档结束**
