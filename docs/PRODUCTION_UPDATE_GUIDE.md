# 生产环境更新文档

**版本**: v1.0
**更新日期**: 2026-03-30
**适用环境**: 生产环境

## 更新概述

本次更新主要包含以下内容：

1. **班次属性管理功能**
   - 新增班次属性定义表 (`ShiftPropertyDefinition`)
   - 新增班次属性关联表 (`ShiftProperty`)
   - 支持为班次打标签功能

2. **系统配置优化**
   - 支持配置产线开线班次属性
   - 工时基础配置页面重构（横向页签布局）

3. **工时基础配置功能增强**
   - 产线对应层级配置
   - 产线开线班次属性配置
   - 间接分摊配置

## 前置条件

- 已有数据库备份
- 后端服务已停止
- 有数据库管理员权限

## 更新步骤

### 1. 数据库迁移

#### 1.1 执行数据库结构变更

```bash
# 连接到生产数据库
psql -U your_username -d your_database

# 执行迁移脚本
\i /path/to/scripts/01-add-shift-property-tables.sql
\i /path/to/scripts/02-add-system-configs.sql
```

或者使用 NestJS CLI 迁移：

```bash
cd /path/to/backend
npm run migration:run
```

#### 1.2 初始化基础数据

```bash
# 连接到生产数据库
psql -U your_username -d your_database

# 执行基础数据初始化脚本
\i /path/to/scripts/03-init-shift-property-data.sql
\i /path/to/scripts/04-init-system-configs.sql
```

### 2. 验证数据迁移

执行验证脚本检查数据完整性：

```bash
psql -U your_username -d your_database -f /path/to/scripts/05-verify-migration.sql
```

### 3. 部署后端服务

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

# 查看日志
pm2 logs jy-backend --lines 100
```

### 4. 部署前端服务

```bash
# 进入前端目录
cd /path/to/frontend

# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 构建生产版本
npm run build

# 部署到服务器
rsync -avz --delete dist/* user@server:/var/www/html/
```

## 回滚方案

如果更新出现问题，执行以下回滚步骤：

### 1. 回滚数据库

```bash
# 恢复数据库备份
psql -U your_username -d your_database < /path/to/backup/before_update.sql

# 或者执行回滚脚本
\i /path/to/scripts/rollback-migration.sql
```

### 2. 回滚代码

```bash
# 后端回滚
cd /path/to/backend
git checkout previous_version_tag
npm run build
pm2 restart jy-backend

# 前端回滚
cd /path/to/frontend
git checkout previous_version_tag
npm run build
rsync -avz --delete dist/* user@server:/var/www/html/
```

## 注意事项

1. **数据备份**: 更新前务必备份数据库
2. **停机时间**: 预计停机时间 10-15 分钟
3. **测试环境**: 建议先在测试环境验证所有脚本
4. **监控**: 更新后监控系统运行状态
5. **日志**: 保留更新期间的日志用于问题排查

## 更新后验证清单

- [ ] 后端服务正常启动
- [ ] 前端页面可以正常访问
- [ ] 班次属性配置功能正常
- [ ] 工时基础配置页面显示正常
- [ ] 开线维护班次下拉框正常过滤
- [ ] 产量记录班次下拉框正常过滤
- [ ] 班次管理页面可以正常配置属性
- [ ] 无错误日志

## 技术支持

如遇到问题，请联系技术支持团队并提供：
- 错误日志
- 执行的SQL脚本
- 数据库版本信息

## 附录

### A. 数据库变更说明

详见附录文档 `database-changes.md`

### B. API 变更说明

详见 API 文档 `api-changes.md`

### C. 前端变更说明

详见前端变更文档 `frontend-changes.md`
