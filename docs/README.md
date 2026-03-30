# 生产环境更新文档索引

**版本**: v1.0
**更新日期**: 2026-03-30

## 📚 文档列表

### 快速开始
- **[快速配置指南.md](./QUICK_START_GUIDE.md)** - 功能使用和配置的快速入门指南
  - 功能概述
  - 快速配置步骤（5步）
  - 常见使用场景
  - 配置最佳实践
  - 故障排查

### 部署文档
- **[部署指南.md](./DEPLOYMENT_GUIDE.md)** - 详细的部署和验证指南
  - 手动部署步骤
  - 自动部署步骤
  - 验证更新
  - 常见问题
  - 回滚指南

### 更新文档
- **[生产更新文档.md](./PRODUCTION_UPDATE_GUIDE.md)** - 生产环境更新指南
  - 更新概述
  - 前置条件
  - 更新步骤
  - 回滚方案
  - 注意事项

## 🛠️ 部署脚本

### SQL 脚本

| 脚本文件 | 说明 | 执行顺序 |
|---------|------|----------|
| `backend/scripts/01-add-shift-property-tables.sql` | 创建班次属性相关表结构 | 1 |
| `backend/scripts/02-init-employee-tabs-and-fields.sql` | 初始化员工信息页签和数据源 | 2 |
| `backend/scripts/02b-init-employee-fields-detail.sql` | 初始化所有内置字段配置 | 3 |
| `backend/scripts/03-init-shift-property-data.sql` | 初始化班次属性数据 | 4 |
| `backend/scripts/04-init-system-configs.sql` | 初始化系统配置 | 5 |
| `backend/scripts/05-verify-migration.sql` | 验证迁移 | 6 |
| `backend/scripts/rollback-migration.sql` | 回滚脚本 | 仅回滚时使用 |

### 部署脚本

| 脚本文件 | 说明 | 使用方式 |
|---------|------|----------|
| `backend/scripts/deploy-production.sh` | 一键部署脚本 | `./deploy-production.sh` |

## 📋 快速导航

### 我想...

#### 了解新功能
→ 阅读 **[快速配置指南.md](./QUICK_START_GUIDE.md)**

#### 自己部署更新
→ 阅读 **[部署指南.md](./DEPLOYMENT_GUIDE.md)** 中的"手动部署步骤"章节

#### 使用自动部署
→ 阅读 **[部署指南.md](./DEPLOYMENT_GUIDE.md)** 中的"自动部署步骤"章节

#### 验证更新结果
→ 阅读 **[部署指南.md](./DEPLOYMENT_GUIDE.md)** 中的"验证更新"章节

#### 遇到问题需要回滚
→ 阅读 **[部署指南.md](./DEPLOYMENT_GUIDE.md)** 中的"回滚指南"章节

## 🚀 快速部署（推荐）

### 方式一：自动部署（最简单）

```bash
# 1. 设置环境变量
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=jy
export DB_USER=postgres
export DB_PASSWORD=your_password

# 2. 执行部署脚本
cd /path/to/backend
./scripts/deploy-production.sh
```

### 方式二：手动部署（更灵活）

```bash
# 1. 备份数据库
pg_dump -U postgres -d jy > backup.sql

# 2. 执行 SQL 脚本（按顺序执行）
psql -U postgres -d jy -f scripts/01-add-shift-property-tables.sql
psql -U postgres -d jy -f scripts/02-init-employee-tabs-and-fields.sql
psql -U postgres -d jy -f scripts/02b-init-employee-fields-detail.sql
psql -U postgres -d jy -f scripts/03-init-shift-property-data.sql
psql -U postgres -d jy -f scripts/04-init-system-configs.sql

# 3. 验证迁移
psql -U postgres -d jy -f scripts/05-verify-migration.sql

# 4. 部署代码
# 后端
cd backend && git pull && npm install && npm run build && pm2 restart jy-backend

# 前端
cd frontend && git pull && npm install && npm run build && sudo cp -r dist/* /var/www/html/
```

## ⚠️ 重要提醒

### 更新前必读

1. **✅ 备份数据库**
   - 更新前务必备份
   - 保存备份文件路径
   - 测试备份文件可用

2. **✅ 测试环境验证**
   - 建议先在测试环境执行
   - 验证所有脚本成功
   - 测试新功能正常

3. **✅ 准备回滚方案**
   - 熟悉回滚步骤
   - 确认备份可用
   - 准备回滚时间窗口

### 更新后必做

1. **✅ 验证数据库**
   - 执行验证脚本
   - 检查基础数据
   - 确认表结构正确

2. **✅ 验证应用**
   - 后端服务正常启动
   - 前端页面可访问
   - 新功能可使用

3. **✅ 配置基础数据**
   - 配置班次属性（可选）
   - 配置工时基础参数
   - 给班次打标签

4. **✅ 监控运行**
   - 检查错误日志
   - 监控性能
   - 收集用户反馈

## 📞 技术支持

### 获取帮助

如果遇到问题：

1. **查看文档**
   - 先查看相关文档
   - 检查"常见问题"章节

2. **查看日志**
   - 后端日志：`pm2 logs jy-backend --lines 100`
   - 前端日志：浏览器控制台
   - 数据库日志：PostgreSQL 日志

3. **联系技术支持**
   - 提供错误信息
   - 提供系统环境
   - 提供操作步骤

### 联系方式

- 技术支持邮箱：support@example.com
- 紧急联系电话：400-xxx-xxxx

## 📊 更新统计

### 本次更新包含

| 类别 | 数量 | 说明 |
|------|------|------|
| 新增表 | 1 | ShiftPropertyDefinition |
| 新增字段 | 2 | ShiftProperty 表字段（description, sortOrder） |
| 新增数据源 | 8 | 性别、婚姻、政治面貌、学历、学位、学历类型、异动类型、员工类型等 |
| 新增页签 | 5 | 基本信息、工作信息、教育信息、工作经历、家庭信息 |
| 新增分组 | 5 | 个人基本信息、联系信息、紧急联系人、职位信息、入职信息 |
| 新增配置 | 7 | 系统配置项（5个工时 + 2个人事） |
| 新增页面 | 1 | 工时基础配置页面重构 |
| 新增功能 | 6 | 属性管理、标签、过滤、工作信息版本管理等 |

### 代码变更

| 模块 | 变更文件数 | 主要变更 |
|------|-----------|----------|
| 后端 | 8+ | 新增 API、数据模型、工作信息版本管理 |
| 前端 | 12+ | 新增页面、优化功能、工作信息更正流程 |
| 脚本 | 9 | SQL 脚本、部署脚本 |
| 文档 | 4 | 使用指南、部署文档 |

## 📝 版本历史

### v1.0 (2026-03-30)

**排班管理模块**
- ✓ 新增班次属性管理功能
- ✓ 新增班次标签功能（支持多选）
- ✓ 优化开线维护和产量记录的班次过滤

**分摊规则模块**
- ✓ 重构工时基础配置页面（横线页签布局）
- ✓ 支持按班次属性过滤班次

**人事管理模块**
- ✓ 工作信息版本管理优化
- ✓ 新增异动类型字段及数据源（10种异动类型）
- ✓ 支持对历史版本进行更正
- ✓ 工作信息页签按钮布局优化
- ✓ 初始化员工类型数据源（5种类型）

**系统功能**
- ✓ 计算管理菜单图标完善
- ✓ 提供完整的部署文档和脚本

---

**文档版本**: v1.0
**最后更新**: 2026-03-30
**维护团队**: 技术团队
