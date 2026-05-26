# 支援申请和报工申请功能测试指南

本文档描述如何测试支援申请和报工申请功能。

## 功能概述

### 1. 支援申请功能
- 跨部门/跨产线支援申请
- 支持临时支援、长期支援、紧急支援
- 工作流审批流程
- 支援任务执行状态跟踪

### 2. 报工申请功能
- 生产报工申请
- 支持正常报工、返工报工、试生产报工
- 工作流审批流程
- 审批通过后同步到生产记录

## 测试步骤

### 第一步：初始化工作流定义

运行初始化脚本创建工作流定义：

```bash
cd backend
npm run ts-node init-workflow-definitions.ts
```

或者使用编译后的脚本：

```bash
cd backend
npx ts-node init-workflow-definitions.ts
```

### 第二步：启动后端服务

```bash
cd backend
npm run start:dev
```

### 第三步：启动前端服务

```bash
cd frontend
npm run dev
```

### 第四步：测试支援申请功能

1. **创建支援申请**
   - 登录系统
   - 点击左侧菜单 "支援申请"
   - 点击 "创建申请" 按钮
   - 填写表单：
     - 申请标题：测试支援申请
     - 申请日期：选择今天
     - 支援类型：临时支援
     - 紧急程度：中
     - 目标组织：选择一个组织
     - 开始时间：今天 08:00
     - 结束时间：今天 18:00
     - 预计工时：8小时
     - 支援原因：测试支援申请功能
   - 点击 "提交申请"

2. **查看申请列表**
   - 在 "全部申请" 标签页查看所有申请
   - 在 "我的申请" 标签页查看自己的申请
   - 验证申请信息是否正确显示

3. **审批申请**
   - 使用审批人账号登录
   - 点击左侧菜单 "待我审批"
   - 找到刚才创建的支援申请
   - 点击 "查看" 查看详情
   - 点击 "审批" 按钮
   - 选择 "同意" 并填写审批意见
   - 提交审批

4. **执行支援任务**
   - 使用申请人账号登录
   - 查看申请状态是否变为 "已通过"
   - 点击 "开始执行" 按钮
   - 填写实际开始时间、结束时间和工时
   - 提交执行信息

5. **完成支援任务**
   - 任务执行完成后
   - 点击 "完成" 按钮
   - 填写工作结果
   - 提交完成信息

### 第五步：测试报工申请功能

1. **创建报工申请**
   - 登录系统
   - 点击左侧菜单 "报工申请"
   - 点击 "创建报工" 按钮
   - 填写表单：
     - 申请标题：测试报工申请
     - 报工日期：选择今天
     - 报工类型：正常报工
     - 产线：选择一个产线
     - 班次：选择一个班次
     - 产品：选择一个产品
     - 计划数量：1000
     - 实际数量：950
     - 合格数量：920
     - 不合格数量：30
     - 标准工时：0.5（根据产品自动填充）
     - 总标准工时：460（自动计算）
   - 点击 "提交申请"

2. **查看申请列表**
   - 在 "全部报工" 标签页查看所有报工
   - 在 "我的报工" 标签页查看自己的报工
   - 验证报工信息是否正确显示

3. **审批报工申请**
   - 使用审批人账号登录
   - 点击左侧菜单 "待我审批"
   - 找到刚才创建的报工申请
   - 点击 "查看" 查看详情
   - 点击 "审批" 按钮
   - 选择 "同意" 并填写审批意见
   - 提交审批

4. **同步到生产记录**
   - 使用报工人账号登录
   - 查看报工状态是否变为 "已通过"
   - 点击 "同步" 按钮
   - 确认同步操作
   - 验证数据是否同步到生产记录表

### 第六步：验证数据库

1. **检查工作流实例**
```sql
SELECT * FROM WorkflowInstance WHERE category IN ('SUPPORT_REQUEST', 'PRODUCTION_REPORT');
```

2. **检查支援申请**
```sql
SELECT * FROM SupportRequest;
```

3. **检查报工申请**
```sql
SELECT * FROM ProductionReportRequest;
```

4. **检查审批记录**
```sql
SELECT * FROM WorkflowApproval WHERE instanceId IN (SELECT id FROM WorkflowInstance WHERE category IN ('SUPPORT_REQUEST', 'PRODUCTION_REPORT'));
```

## 常见问题排查

### 1. 后端启动失败
- 检查模块是否正确引入到 `app.module.ts`
- 检查依赖是否安装完整

### 2. 前端页面404
- 检查路由配置是否正确
- 检查页面组件是否正确导出

### 3. 工作流初始化失败
- 检查数据库连接是否正常
- 检查是否有足够的权限创建记录

### 4. 创建申请失败
- 检查工作流定义是否存在
- 检查必填字段是否完整
- 检查用户权限是否足够

## API 端点列表

### 支援申请
- `POST /support/requests` - 创建支援申请
- `GET /support/requests` - 获取支援申请列表
- `GET /support/requests/:id` - 获取支援申请详情
- `PUT /support/requests/:id` - 更新支援申请
- `POST /support/requests/:id/execute` - 开始执行支援任务
- `POST /support/requests/:id/complete` - 完成支援任务
- `POST /support/requests/:id/cancel` - 取消支援任务
- `GET /support/my-requests` - 获取我的支援申请
- `GET /support/pending-approvals` - 获取待审批的支援申请

### 报工申请
- `POST /report/requests` - 创建报工申请
- `GET /report/requests` - 获取报工申请列表
- `GET /report/requests/:id` - 获取报工申请详情
- `GET /report/my-requests` - 获取我的报工申请
- `GET /report/pending-approvals` - 获取待审批的报工申请
- `POST /report/requests/:id/sync` - 同步到生产记录

## 前端路由

### 支援申请
- `/support/list` - 支援申请列表
- `/support/create` - 创建支援申请

### 报工申请
- `/report/list` - 报工申请列表
- `/report/create` - 创建报工申请

## 完成清单

- [ ] 后端模块创建完成
- [ ] 前端页面创建完成
- [ ] 路由配置完成
- [ ] 菜单项添加完成
- [ ] 工作流定义初始化完成
- [ ] 支援申请功能测试通过
- [ ] 报工申请功能测试通过
- [ ] 数据库数据验证通过
