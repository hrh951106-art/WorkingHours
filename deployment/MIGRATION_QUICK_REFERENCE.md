# PostgreSQL 数据库迁移 - 快速参考

## 📦 迁移文件清单

### 1. 核心文件

| 文件名 | 位置 | 大小 | 说明 |
|--------|------|------|------|
| **jy_production_complete_20260529_125652.sql** | deployment/ | 534KB | **完整数据库迁移文件（推荐使用）** |
| **migrate_sqlite_to_postgres.py** | backend/ | - | SQLite到PostgreSQL迁移脚本 |
| **POSTGRESQL_MIGRATION_GUIDE.md** | deployment/ | 8.3KB | 详细迁移指南 |
| **verify-migration.sh** | deployment/ | 6.2KB | 迁移验证脚本 |

### 2. 文件统计

- ✅ **87张表** - 完整表结构
- ✅ **880+条记录** - 完整数据
- ✅ **PostgreSQL兼容** - 数据类型自动转换
- ✅ **UTF-8编码** - 支持中文

## 🚀 快速开始

### 步骤 1: 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 步骤 2: 创建数据库

```bash
cd deployment
sudo ./setup-database.sh -f jy_production_complete_20260529_125652.sql
```

或手动创建：

```bash
sudo -u postgres psql << EOF
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
EOF
```

### 步骤 3: 导入数据

```bash
export PGPASSWORD='your_password'
psql -U jy_user -d jy_production -h localhost -f jy_production_complete_20260529_125652.sql
```

### 步骤 4: 验证迁移

```bash
./verify-migration.sh
```

## 📋 验证检查清单

运行以下命令验证迁移是否成功：

```bash
# 1. 检查表数量
psql -U jy_user -d jy_production -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
# 预期输出: 87

# 2. 检查关键表数据
psql -U jy_user -d jy_production << EOF
SELECT COUNT(*) FROM "User";       -- 预期: 13
SELECT COUNT(*) FROM "Role";       -- 预期: 2
SELECT COUNT(*) FROM "Employee";   -- 预期: 11
SELECT COUNT(*) FROM "PunchRecord"; -- 预期: 25
EOF

# 3. 运行完整验证
./verify-migration.sh
```

## 🔧 常用命令

### 数据库连接

```bash
# 连接到数据库
psql -U jy_user -d jy_production -h localhost

# 连接后执行查询
\dt                    # 列出所有表
\du                    # 列出所有用户
\l                     # 列出所有数据库
\q                     # 退出
```

### 数据库管理

```bash
# 备份数据库
pg_dump -U jy_user -d jy_production > backup_$(date +%Y%m%d).sql

# 删除数据库（谨慎使用）
sudo -u postgres psql -c "DROP DATABASE IF EXISTS jy_production;"

# 查看数据库大小
psql -U jy_user -d jy_production -c "SELECT pg_size_pretty(pg_database_size('jy_production'));"
```

### 故障排查

```bash
# 查看PostgreSQL日志
sudo tail -f /var/log/postgresql/postgresql-*.log

# 检查PostgreSQL状态
sudo systemctl status postgresql

# 重启PostgreSQL
sudo systemctl restart postgresql
```

## 🎯 应用程序配置

### 更新环境变量

编辑 `backend/.env.production`:

```env
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public"
```

### 重新生成 Prisma Client

```bash
cd backend
npm run prisma:generate
npm run build
```

### 启动应用

```bash
npm run start:prod
# 或使用 PM2
pm2 start ecosystem.config.js --env production
```

## ⚠️ 常见问题

### 问题: 连接被拒绝

```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查 pg_hba.conf 配置
sudo nano /etc/postgresql/*/main/pg_hba.conf
# 确保有这行: host    all    all    127.0.0.1/32    md5

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 问题: 权限不足

```bash
sudo -u postgres psql << EOF
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\c jy_production
GRANT ALL ON SCHEMA public TO jy_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO jy_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO jy_user;
EOF
```

### 问题: 重新导入

```bash
# 删除并重新创建数据库
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS jy_production;
CREATE DATABASE jy_production;
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
EOF

# 重新导入
export PGPASSWORD='your_password'
psql -U jy_user -d jy_production -f jy_production_complete_20260529_125652.sql
```

## 📞 技术支持

如有问题，请参考：

1. **详细迁移指南**: `POSTGRESQL_MIGRATION_GUIDE.md`
2. **验证脚本**: `./verify-migration.sh`
3. **PostgreSQL 文档**: https://www.postgresql.org/docs/

## ✅ 迁移完成确认

- [ ] PostgreSQL 运行正常
- [ ] 数据库和用户创建成功
- [ ] 数据导入成功（87张表）
- [ ] 验证脚本检查通过
- [ ] 应用程序连接成功
- [ ] 基本功能测试通过

---

**迁移时间**: 2026-05-29 12:56:52
**文件版本**: 1.0
**状态**: ✅ 生产就绪
