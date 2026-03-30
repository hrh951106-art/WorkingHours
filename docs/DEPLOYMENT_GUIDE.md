# 生产环境更新使用指南

**版本**: v1.0
**更新日期**: 2026-03-30

## 目录

1. [快速开始](#快速开始)
2. [手动部署步骤](#手动部署步骤)
3. [自动部署步骤](#自动部署步骤)
4. [验证更新](#验证更新)
5. [常见问题](#常见问题)
6. [回滚指南](#回滚指南)

---

## 快速开始

### 前置要求

- PostgreSQL 数据库管理员权限
- 后端服务器 SSH 访问权限
- 已完成代码更新

### 一键部署（推荐）

```bash
# 进入后端目录
cd /path/to/backend

# 执行部署脚本
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

---

## 手动部署步骤

### 步骤 1: 数据库备份

**非常重要！更新前务必备份数据库！**

```bash
# 创建备份目录
mkdir -p /data/backups

# 备份数据库
pg_dump -U postgres -d jy > /data/backups/jy-before-update-$(date +%Y%m%d-%H%M%S).sql
```

### 步骤 2: 执行数据库迁移

```bash
# 连接到数据库
psql -U postgres -d jy

# 执行表结构变更
\i /path/to/backend/scripts/01-add-shift-property-tables.sql

# 初始化员工信息页签和数据源
\i /path/to/backend/scripts/02-init-employee-tabs-and-fields.sql

# 初始化所有内置字段配置
\i /path/to/backend/scripts/02b-init-employee-fields-detail.sql

# 初始化班次属性数据
\i /path/to/backend/scripts/03-init-shift-property-data.sql

# 初始化系统配置
\i /path/to/backend/scripts/04-init-system-configs.sql
```

### 步骤 3: 验证迁移

```bash
# 执行验证脚本
psql -U postgres -d jy -f /path/to/backend/scripts/05-verify-migration.sql
```

检查输出结果，确认：
- ✓ 表结构创建成功
- ✓ 基础数据插入成功
- ✓ 没有异常数据

### 步骤 4: 部署后端代码

```bash
# 进入后端目录
cd /path/to/backend

# 停止服务
pm2 stop jy-backend

# 拉取最新代码
git pull origin main

# 安装依赖
npm install --production

# 构建项目
npm run build

# 启动服务
pm2 start jy-backend

# 检查日志
pm2 logs jy-backend --lines 50
```

### 步骤 5: 部署前端代码

```bash
# 进入前端目录
cd /path/to/frontend

# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 构建生产版本
npm run build

# 部署到 Web 服务器
rsync -avz --delete dist/* /var/www/html/
```

---

## 自动部署步骤

### 使用部署脚本

```bash
# 1. 设置环境变量
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=jy
export DB_USER=postgres
export DB_PASSWORD=your_password
export BACKEND_DIR=/path/to/backend
export FRONTEND_DIR=/path/to/frontend
export DEPLOY_SERVER=user@server
export WEB_ROOT=/var/www/html

# 2. 执行部署脚本
cd /path/to/backend
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

### 脚本功能

部署脚本会自动执行以下操作：

1. ✓ 检查前置条件
2. ✓ 备份数据库
3. ✓ 执行数据库迁移
4. ✓ 验证迁移结果
5. ✓ 部署后端代码
6. ✓ 部署前端代码

---

## 验证更新

### 1. 数据库验证

执行验证脚本后，检查以下内容：

```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('ShiftPropertyDefinition', 'ShiftProperty');

-- 检查班次属性基础数据
SELECT COUNT(*) FROM "ShiftPropertyDefinition";

-- 检查异动类型数据源
SELECT COUNT(*) FROM "DataSourceOption"
WHERE "dataSourceId" = (SELECT "id" FROM "DataSource" WHERE "code" = 'CHANGE_TYPE');

-- 检查工作信息页签配置
SELECT COUNT(*) FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info');

-- 检查系统配置
SELECT configkey FROM "SystemConfig"
WHERE configkey LIKE 'productionLine%' OR configkey LIKE 'workInfo%';
```

**预期结果：**
- ShiftPropertyDefinition 表存在
- 班次属性基础数据数量 = 6（早班、中班、晚班、夜班、开线班次、特殊班次）
- 异动类型数据源选项数量 = 10（入职、转正、晋升、降职、调岗、离职等）
- 工作信息页签字段数量 >= 9（包含异动类型字段）
- 系统配置包含 7 条新配置（2个HR + 5个工时）

### 2. 功能验证

登录系统后，验证以下功能：

#### 2.1 班次属性配置
- 访问路径: `/shift/property-config`
- 验证: 能够看到 6 个预定义的班次属性
- 验证: 能够新增、编辑、删除属性定义

#### 2.2 班次管理
- 访问路径: `/shift/shifts`
- 点击"新建班次"或编辑现有班次
- 验证: 在表单中能看到"班次属性"多选框
- 验证: 能够选择多个属性给班次打标签

#### 2.3 工时基础配置
- 访问路径: `/allocation/basic-config`
- 验证: 页面显示两个页签（工时基础配置、产品配置）
- 验证: 能看到"产线开线班次属性"配置项
- 验证: 能看到"匹配的班次数量"提示

#### 2.4 开线维护
- 访问路径: `/allocation/line-maintenance`
- 点击"新增开线记录"
- 验证: 班次下拉框只显示带有"开线班次"属性的班次

#### 2.5 产量记录
- 访问路径: `/allocation/production-records`
- 点击"新增产量记录"或"批量导入"
- 验证: 班次下拉框只显示带有"开线班次"属性的班次

#### 2.6 员工详情 - 工作信息页签
- 访问路径: `/hr/employees` → 选择任意员工
- 点击"工作信息"页签
- 验证: 页面显示"更新"和"更正"按钮（不是"保存"和"取消"）
- 验证: 版本选择器正常显示
- 验证: 点击"更新"后显示"异动类型"字段（必填）
- 验证: 选择历史版本后点击"更正"，可以编辑该版本
- 验证: 保存后，更正的内容保存到正确的版本上

#### 2.7 数据源管理（可选验证）
- 访问路径: `/hr/data-sources`
- 验证: 能够看到"异动类型"数据源
- 验证: 异动类型数据源包含 10 个选项
- 验证: 能够看到"员工类型"数据源（如果存在）
- 验证: 员工类型数据源包含 5 个选项

---

## 常见问题

### Q1: 数据库迁移失败

**错误信息**: `relation "ShiftPropertyDefinition" already exists`

**解决方案**:
```sql
-- 检查表是否已存在
SELECT table_name FROM information_schema.tables
WHERE table_name = 'ShiftPropertyDefinition';

-- 如果已存在，跳过表创建脚本，直接执行数据初始化
```

### Q2: 后端服务启动失败

**错误信息**: `Cannot find module`

**解决方案**:
```bash
cd /path/to/backend
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart jy-backend
```

### Q3: 前端页面无法访问

**可能原因**: 构建文件未正确部署

**解决方案**:
```bash
cd /path/to/frontend
npm run build
# 检查 dist 目录是否生成
ls -la dist/
# 重新部署
sudo cp -r dist/* /var/www/html/
```

### Q4: 班次下拉框为空

**可能原因**:
1. 未在工时基础配置中设置"产线开线班次属性"
2. 班次未配置对应的属性

**解决方案**:
1. 进入"工时基础配置"页面
2. 在"产线开线班次属性"中选择属性（如"开线班次"）
3. 进入"班次管理"，给需要的班次添加"开线班次"属性

### Q5: 验证脚本报错

**错误信息**: `column "propertyKey" does not exist`

**解决方案**:
- 确认已执行 `01-add-shift-property-tables.sql`
- 检查表结构是否正确创建
- 重新执行迁移脚本

---

## 回滚指南

### 场景 1: 需要回滚数据库

```bash
# 1. 停止应用服务
pm2 stop jy-backend

# 2. 恢复数据库备份
psql -U postgres -d jy < /data/backups/jy-before-update-YYYYMMDD-HHMMSS.sql

# 3. 重新启动服务
pm2 start jy-backend

# 4. 验证回滚
pm2 status
```

### 场景 2: 需要回滚代码

```bash
# 后端回滚
cd /path/to/backend
git checkout <previous-commit-hash>
npm run build
pm2 restart jy-backend

# 前端回滚
cd /path/to/frontend
git checkout <previous-commit-hash>
npm run build
sudo cp -r dist/* /var/www/html/
```

### 场景 3: 使用回滚脚本

```bash
# 连接到数据库
psql -U postgres -d jy

# 执行回滚脚本
\i /path/to/backend/scripts/rollback-migration.sql
```

---

## 技术支持

如果遇到无法解决的问题，请联系技术支持并提供：

1. 系统环境信息
   - 操作系统版本
   - PostgreSQL 版本
   - Node.js 版本

2. 错误信息
   - 完整的错误日志
   - 执行的命令
   - 错误截图

3. 数据库信息
   - 数据库版本
   - 表结构信息
   - 迁移日志

---

## 附录

### A. 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| DB_NAME | 数据库名称 | jy |
| DB_USER | 数据库用户 | postgres |
| BACKEND_DIR | 后端目录 | /path/to/backend |
| FRONTEND_DIR | 前端目录 | /path/to/frontend |

### B. 相关文件清单

| 文件路径 | 说明 |
|---------|------|
| scripts/01-add-shift-property-tables.sql | 创建班次属性相关表结构 |
| scripts/02-init-employee-tabs-and-fields.sql | 初始化员工信息页签和数据源 |
| scripts/02b-init-employee-fields-detail.sql | 初始化所有内置字段配置 |
| scripts/03-init-shift-property-data.sql | 初始化班次属性数据 |
| scripts/04-init-system-configs.sql | 初始化系统配置 |
| scripts/05-verify-migration.sql | 验证迁移 |
| scripts/rollback-migration.sql | 回滚脚本 |
| scripts/deploy-production.sh | 一键部署脚本 |
| docs/PRODUCTION_UPDATE_GUIDE.md | 更新文档 |

### C. 数据库变更汇总

**新增表:**
- ShiftPropertyDefinition（班次属性定义表）

**新增字段:**
- ShiftProperty.description（属性描述）
- ShiftProperty.sortOrder（排序字段）
- WorkInfoHistory.changeType（异动类型字段，已存在于表结构中）

**新增数据源:**
- CHANGE_TYPE（异动类型数据源，10种选项）
- EMPLOYEE_TYPE（员工类型数据源，5种选项）
- GENDER（性别数据源，2种选项）
- MARITAL_STATUS（婚姻状况数据源，4种选项）
- POLITICAL_STATUS（政治面貌数据源，5种选项）
- EDUCATION_LEVEL（学历层次数据源，7种选项）
- DEGREE（学位数据源，3种选项）
- EDUCATION_TYPE（学历类型数据源，3种选项）

**员工信息页签配置:**
- 基本信息页签（3个分组，16个字段）
- 工作信息页签（2个分组，10个字段）
- 教育信息页签（8个字段）
- 工作经历页签（7个字段）
- 家庭信息页签（9个字段）

**新增系统配置:**
- workInfoVersionEnabled（是否启用工作信息版本管理）
- workInfoChangeTypeRequired（工作信息异动类型是否必填）
- productionLineHierarchyLevel（产线对应层级）
- productionLineShiftPropertyKeys（产线开线班次属性）
- productionLineShiftIds（产线班次ID列表）
- actualHoursAllocationCode（按实际工时分配的工时代码）
- indirectHoursAllocationCode（间接工时分配的工时代码）

**人事模块基础数据:**
- 工作信息页签配置（EmployeeInfoTab）
- 职位信息字段组配置（EmployeeInfoTabGroup）
- 入职信息字段组配置（EmployeeInfoTabGroup）
- 工作信息字段配置（EmployeeInfoTabField），包含：
  - 职位、职级、员工类型
  - 工作地点、工作地址
  - 所属组织、异动类型
  - 入职日期、试用期满日期、生效日期

---

**文档版本**: v1.0
**最后更新**: 2026-03-30
**维护人员**: 技术团队
