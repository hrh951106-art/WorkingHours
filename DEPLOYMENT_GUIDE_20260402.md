# 员工信息系统字段修复 - 部署文档

**版本：** 20260402
**发布日期：** 2026-04-02
**部署类型：** Bug修复 + 功能优化

---

## 📋 变更概述

本次更新主要修复员工信息系统中字段验证、显示和编辑的相关问题，包括：

1. ✅ 修复隐藏字段的数据库验证问题
2. ✅ 修复民族和紧急联系人关系字段的下拉选择显示
3. ✅ 修复所有日期字段的格式化显示
4. ✅ 优化系统字段的数据源返回逻辑

---

## 🎯 核心问题修复

### 问题 1：隐藏字段导致员工创建失败
**问题描述：**
- 性别字段（gender）在UI中隐藏，但数据库层面仍为必填
- 创建员工时报错：`Argument 'gender' is missing`
- 姓名、性别等字段需要支持可选填写

**解决方案：**
- 将 `Employee.name` 和 `Employee.gender` 字段改为可选
- 修改后端创建逻辑，跳过隐藏字段的验证
- 只验证"启用 + 显示 + 必填"的字段
- 三个核心字段（工号、入职日期、所属组织）始终保持必填

### 问题 2：民族和紧急联系人关系字段显示为输入框
**问题描述：**
- 民族字段（nation）在新增页面是下拉选择
- 在详情页编辑时变成文本输入框
- 紧急联系人关系字段（emergencyRelation）同样问题

**解决方案：**
- 在 `renderSystemField` 函数中添加 `nation` 和 `emergencyRelation` case
- 确保系统字段正确使用数据源选项
- 统一字段渲染逻辑

### 问题 3：日期字段显示 ISO 格式
**问题描述：**
- 日期字段显示为 `2026-03-01T00:00:00.000Z`
- 期望显示为 `2026-03-01`

**解决方案：**
- 扩展日期字段识别逻辑（支持驼峰命名：entryDate, hireDate, birthDate 等）
- 增强日期格式化函数
- 确保所有日期字段统一显示格式

---

## 📁 文件变更清单

### 前端变更

| 文件路径 | 变更类型 | 变更说明 |
|---------|---------|---------|
| `frontend/src/pages/hr/EmployeeDetailPage.tsx` | Bug修复 | 添加 nation 和 emergencyRelation 字段的下拉选择渲染 |
| `frontend/src/pages/hr/EmployeeDetailPage.tsx` | 优化 | 修复日期字段格式化逻辑，支持所有驼峰命名的日期字段 |

### 后端变更

| 文件路径 | 变更类型 | 变更说明 |
|---------|---------|---------|
| `backend/prisma/schema.prisma` | Schema变更 | Employee.name 和 Employee.gender 改为可选 |
| `backend/src/modules/hr/hr.service.ts` | 逻辑优化 | createEmployee 方法跳过隐藏字段验证 |
| `backend/src/modules/hr/dto/employee.dto.ts` | DTO变更 | CreateEmployeeDto.name 字段改为可选 |
| `backend/src/modules/hr/employee-info-tab.service.ts` | 逻辑优化 | 系统字段带数据源时返回 SELECT_SINGLE 类型 |

### 数据库变更

| 表名 | 变更类型 | 变更说明 |
|-----|---------|---------|
| `Employee` | 表结构变更 | name 和 gender 字段改为可选 |
| `EmployeeInfoTabField` | 数据更新 | 更新 dataSourceId（emergencyRelation, jobLevel, status） |

---

## 🚀 部署步骤

### 前置条件检查

```bash
# 1. 确认当前环境
NODE_ENV=production  # 确保是生产环境

# 2. 备份数据库
cp backend/prisma/dev.db backend/prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# 3. 检查当前运行的进程
ps aux | grep -E "node|vite" | grep -v grep
```

### 步骤 1：数据库迁移

```bash
# 进入后端目录
cd backend

# 执行数据库迁移脚本
sqlite3 prisma/dev.db < scripts/update-employee-fields-20260402.sql

# 验证迁移结果
sqlite3 prisma/dev.db "PRAGMA table_info(Employee);"
sqlite3 prisma/dev.db "SELECT fieldCode, fieldName, dataSourceId FROM EmployeeInfoTabField WHERE fieldCode IN ('emergencyRelation', 'jobLevel', 'status');"
```

**预期输出：**
```
# Employee 表结构
id|INTEGER|0||1
employeeNo|TEXT|1||0
name|TEXT|0||0          ✅ 可选
gender|TEXT|0||0        ✅ 可选
...

# dataSourceId 更新
emergencyRelation|紧急联系人关系|19
jobLevel|职级|13
status|在职状态|15
```

### 步骤 2：后端部署

```bash
# 停止现有后端服务
pm2 stop jy-backend
# 或
kill $(cat backend.pid)

# 拉取最新代码
git pull origin main

# 安装依赖（如有更新）
npm install

# 构建后端
npm run build

# 启动后端服务
pm2 start ecosystem.config.js --update-env
# 或
npm run start:prod

# 验证后端服务
curl http://localhost:3001/api/health
```

### 步骤 3：前端部署

```bash
# 停止现有前端服务（如果有）
pm2 stop jy-frontend

# 构建前端生产版本
cd frontend
npm run build

# 部署到生产服务器
# 方式 1: 使用 PM2
pm2 serve dist 5173 --spa --name "jy-frontend"

# 方式 2: 使用 Nginx（推荐）
# 将 dist 目录内容复制到 Nginx 静态文件目录
# scp -r dist/* user@server:/var/www/html/

# 方式 3: 使用 Docker
docker build -t jy-frontend:latest .
docker stop jy-frontend && docker rm jy-frontend
docker run -d -p 5173:80 --name jy-frontend jy-frontend:latest
```

### 步骤 4：Nginx 配置更新（如使用 Nginx）

```nginx
# /etc/nginx/sites-available/jy-frontend
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl reload nginx
```

### 步骤 5：验证部署

```bash
# 1. 检查后端服务
curl http://localhost:3001/api/health

# 2. 检查前端服务
curl http://localhost:5173

# 3. 测试员工创建接口
curl -X POST http://localhost:3001/api/hr/employees \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNo": "TEST001",
    "orgId": 1,
    "entryDate": "2026-04-02"
  }'

# 预期：创建成功（不要求 name 和 gender）

# 4. 测试民族字段渲染
# 浏览器访问：http://localhost:5173/hr/employees/1
# 点击"编辑"按钮，检查民族字段是否为下拉选择

# 5. 测试日期字段显示
# 检查入职日期等字段是否显示为 2026-03-01 格式
```

---

## 🔍 功能验证清单

### 员工创建功能

- [ ] 创建员工时不填写姓名，系统不报错
- [ ] 创建员工时不填写性别，系统不报错
- [ ] 工号、入职日期、所属组织仍为必填
- [ ] 隐藏字段不参与验证

### 员工编辑功能

- [ ] 民族字段在编辑模式下显示为下拉选择
- [ ] 紧急联系人关系字段显示为下拉选择
- [ ] 下拉选项正确加载（从数据源）
- [ ] 选择后能正确保存

### 日期字段显示

- [ ] 入职日期显示为 `2026-03-01` 格式
- [ ] 受雇日期显示为 `2026-03-01` 格式
- [ ] 出生日期显示为 `2026-03-01` 格式
- [ ] 试用期开始/结束日期显示为 `2026-03-01` 格式
- [ ] 所有其他日期字段统一格式

---

## 🔄 回滚方案

### 场景 1：数据库迁移失败

```bash
# 恢复数据库备份
cd backend
cp prisma/dev.db.backup.YYYYMMDD_HHMMSS prisma/dev.db

# 或者执行回滚 SQL
sqlite3 prisma/dev.db < scripts/rollback-employee-fields-20260402.sql
```

### 场景 2：后端服务异常

```bash
# 回退到上一个版本
cd backend
git log --oneline -5  # 查看最近提交
git checkout <上一个版本的commit hash>
npm run build
pm2 restart jy-backend
```

### 场景 3：前端功能异常

```bash
# 回退前端
cd frontend
git checkout <上一个版本的commit hash>
npm run build
# 重新部署到 Nginx 或 Docker
```

---

## 📊 性能影响评估

| 项目 | 影响评估 | 说明 |
|-----|---------|-----|
| 数据库查询 | 无影响 | 仅修改表结构，未增加查询 |
| 前端渲染 | 轻微提升 | 优化了日期格式化逻辑 |
| 后端响应 | 轻微提升 | 减少了不必要的字段验证 |
| 内存使用 | 无影响 | 无新增全局变量或缓存 |

---

## ⚠️ 注意事项

1. **数据库备份**：部署前务必备份数据库
2. **测试验证**：建议在测试环境先验证通过再部署生产
3. **停机时间**：数据库迁移需要短暂停机（约1-2秒）
4. **兼容性**：本次变更向后兼容，不影响现有数据
5. **前端缓存**：部署后建议清除浏览器缓存

---

## 📞 问题排查

### 常见问题

**Q: 民族字段仍然显示为输入框？**
A: 清除浏览器缓存并刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）

**Q: 创建员工时仍提示 gender 必填？**
A: 检查数据库迁移是否成功执行，确认 Employee.gender 字段已为可选

**Q: 日期字段仍显示 ISO 格式？**
A: 检查前端是否使用了最新构建版本（查看 dist 目录时间戳）

---

## 📝 后续优化建议

1. **字段配置优化**：考虑在前端增加字段类型自动识别
2. **数据源缓存**：对下拉选项数据增加缓存机制
3. **批量导入优化**：更新 Excel 导入模板，支持新的字段规则
4. **API 文档更新**：更新 Swagger 文档，反映字段可选性变更

---

## ✅ 部署完成确认

部署完成后，请确认以下项目：

- [ ] 数据库迁移成功
- [ ] 后端服务正常运行
- [ ] 前端服务正常访问
- [ ] 功能验证清单全部通过
- [ ] 无错误日志
- [ ] 性能指标正常

---

**部署负责人：** ______________________
**部署日期：** ______________________
**验证人：** ______________________
**完成时间：** ______________________
