# 精益工时管理系统 - 部署文件说明

本目录包含生产环境部署所需的所有文件和文档。

---

## 📁 文件清单

### 1. 数据库备份文件

- **jy_production_backup_20260529_013155.sql** (536KB) ⭐ **使用此文件**
  - **完整的生产数据库备份**（已转换为 PostgreSQL 格式）
  - **数据来源**：从开发环境 SQLite 数据库 (`dev.db`) 自动转换
  - **包含内容**：
    - ✅ 所有表结构（PostgreSQL 格式，包含 SERIAL 主键、TIMESTAMP 等）
    - ✅ 所有业务数据（**863条记录**）
      - 用户数据：13 个用户
      - 组织架构：8 个组织
      - 员工信息：11 个员工
      - 工时结果��**102 条工时记录**
      - 考勤打卡：21 条打卡记录
      - 生产记录：10 条生产记录
      - 分摊结果：8 条分摊记录
      - 工作流：13 个流程实例、72 条审批记录
      - 所有其他业务数据
    - ✅ 所有配置数据（考勤规则、数据源、自定义字段等）
    - ✅ 序列重置命令（自动设置自增ID起始值）
  - **可直接导入 PostgreSQL**：无需执行其他 SQL 或迁移脚本
  - **导入前注意**：目标数据库必须为空

- ~~jy_production_backup_old_20260529_012310.sql.bak~~ (62KB) - 旧版本（仅配置数据，已弃用）

**重要说明**：
- ✅ 已从 SQLite 转换为 PostgreSQL 格式
- ✅ 包含完整表结构和数据，一次导入即可使用
- ✅ 包含所有业务数据（工时、考勤、生产、分摊、工作流等）
- ❌ 不要在生产环境使用原始的 `.db` 文件（SQLite 格式不兼容）
- ❌ 导入后无需执行 `prisma migrate deploy` 或 seed 脚本

### 2. 部署文档

- **PRODUCTION_DEPLOYMENT_GUIDE.md** (22KB)
  - 详细的生产环境部署操作手册
  - 包含完整的部署流程、配置说明和故障排查
  - 适用于首次部署和详细了解部署流程

- **DEPLOYMENT_QUICK_START.md** (9.3KB)
  - 快速部署指南
  - 提供简洁的步骤命令，适合快速上手
  - 包含常用管理命令和更新流程

- **DATABASE_MIGRATION_GUIDE.md** (6.8KB)
  - 数据库迁移技术文档
  - 详细说明 SQLite 到 PostgreSQL 的转换过程
  - 包含常见问题解答和技术细节

- **README.md** (本文件)
  - 部署文件说明和快速索引

### 3. 部署脚本

- **setup-database.sh** (4.9KB)
  - 数据库初始化脚本
  - 自动创建数据库、用户和导入数据
  - 验证数据库安装是否成功

  使用方法:
  ```bash
  sudo ./setup-database.sh \
    -f jy_production_backup_20260529_013155.sql \
    -p your_database_password
  ```

- **deploy-backend.sh** (3.6KB)
  - 后端自动部署脚本
  - 安装依赖、构建项目、启动服务
  - 支持自动备份和热更新

  使用方法:
  ```bash
  cd /var/www/jy-backend
  sudo ./deploy-backend.sh
  ```

- **deploy-frontend.sh** (2.2KB)
  - 前端自动部署脚本
  - 部署静态文件、设置权限
  - 支持自动备份

  使用方法:
  ```bash
  sudo ./deploy-frontend.sh /tmp/jy-frontend-dist
  ```

---

## 🚀 快速开始

### 首次部署

1. **阅读文档**
   - 如果是首次部署，建议先阅读 `PRODUCTION_DEPLOYMENT_GUIDE.md`
   - 快速上手可参考 `DEPLOYMENT_QUICK_START.md`

2. **准备文件**
   - 上传本目录的所有文件到服务器 `/var/www/` 目录
   - 上传后端代码压缩包和前端构建文件

3. **执行部署**
   ```bash
   # 1. 初始化数据库（使用完整备份）
   sudo ./setup-database.sh \
     -f jy_production_backup_20260529_013155.sql \
     -p your_password

   # 2. 部署后端
   cd /var/www/jy-backend
   sudo ../deploy-backend.sh

   # 3. 部署前端
   cd /var/www
   sudo ./deploy-frontend.sh /tmp/jy-frontend-dist

   # 4. 配置 Nginx
   sudo nano /etc/nginx/sites-available/jy-system
   ```

### 更新部署

```bash
# 更新后端
cd /var/www/jy-backend
sudo /var/www/deploy-backend.sh

# 更新前端
cd /var/www
sudo ./deploy-frontend.sh /tmp/jy-frontend-dist
```

---

## 📋 部署检查清单

在部署到生产环境前，请确认以下事项：

### 环境准备
- [ ] Linux 服务器已准备（Ubuntu 20.04+ / CentOS 8+）
- [ ] Node.js v18+ 已安装
- [ ] PostgreSQL 14+ 已安装并运行
- [ ] Nginx 已安装并运行
- [ ] PM2 已全局安装
- [ ] 域名已解析到服务器 IP

### 配置文件
- [ ] 后端 `.env.production` 已配置
- [ ] 数据库连接字符串正确
- [ ] JWT_SECRET 已设置为强密码
- [ ] CORS 配置正确
- [ ] Nginx 配置正确

### 安全设置
- [ ] SSL 证书已配置
- [ ] 防火墙规则已设置
- [ ] 数据库密码强度足够
- [ ] 系统自动备份已配置
- [ ] SSH 密钥已配置

### 功能验证
- [ ] 后端 API 正常响应
- [ ] 前端页面正常加载
- [ ] 用户登录功能正常
- [ ] 数据库读写正常
- [ ] 文件上传功能正常
- [ ] 日志记录正常

---

## 🔧 常用命令

### 服务管理

```bash
# 查看后端服务状态
sudo pm2 status

# 查看后端日志
sudo pm2 logs jy-backend

# 重启后端服务
sudo pm2 restart jy-backend

# 查看系统服务状态
sudo systemctl status nginx
sudo systemctl status postgresql
```

### 数据库管理

```bash
# 连接数据库
psql -U jy_user -d jy_production

# 手动备份数据库
PGPASSWORD="your_password" pg_dump -U jy_user jy_production > backup.sql

# 恢复数据库
PGPASSWORD="your_password" psql -U jy_user jy_production < backup.sql
```

### 日志查看

```bash
# Nginx 访问日志
sudo tail -f /var/log/nginx/jy-access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/jy-error.log

# 后端应用日志
sudo tail -f /var/www/jy-backend/logs/combined.log
```

---

## 📞 技术支持

如果在部署过程中遇到问题：

1. 查看详细文档: `PRODUCTION_DEPLOYMENT_GUIDE.md` 第10章故障排查
2. 检查日志文件
3. 查看数据库迁移文档: `DATABASE_MIGRATION_GUIDE.md`
4. 联系技术支持: support@your-domain.com

---

## ⚠️ 重要提示

1. **备份文件选择**: 请使用 `jy_production_backup_20260529_013155.sql` (536KB) 文件，该文件包含所有业务数据

2. **数据库格式**: SQLite 和 PostgreSQL 不兼容，必须使用转换后的 SQL 文件

3. **无需额外操作**: 导入备份文件后，无需执行其他 SQL 或迁移脚本

4. **生产环境注意**:
   - 务必备份数据库和代码
   - 建议先在测试环境验证
   - 使用强密码和 SSL 证书
   - 配置监控和告警

---

## 📝 更新记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-05-29 | 2.0 | 更新为完整备份（包含所有业务数据） |
| 2025-05-29 | 1.0 | 初始版本 |

---

**文档维护**: 系统管理团队
**最后更新**: 2025-05-29
