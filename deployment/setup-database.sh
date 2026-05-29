#!/bin/bash
# 精益工时管理系统 - 数据库初始化脚本
# 使用方法: sudo ./setup-database.sh

set -e

echo "========================================"
echo "精益工时管理系统 - 数据库初始化"
echo "========================================"

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "请使用 sudo 运行此脚本"
  exit 1
fi

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 数据库配置
DB_NAME="jy_production"
DB_USER="jy_user"
DB_PASSWORD=""
SQL_FILE=""

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file)
      SQL_FILE="$2"
      shift 2
      ;;
    -p|--password)
      DB_PASSWORD="$2"
      shift 2
      ;;
    -u|--user)
      DB_USER="$2"
      shift 2
      ;;
    -d|--database)
      DB_NAME="$2"
      shift 2
      ;;
    *)
      echo "未知选项: $1"
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}【步骤 1/5】输入数据库配置${NC}"

# 如果没有提供密码，提示输入
if [ -z "$DB_PASSWORD" ]; then
  read -sp "请输入数据库用户 '$DB_USER' 的密码: " DB_PASSWORD
  echo
fi

if [ -z "$DB_PASSWORD" ]; then
  echo -e "${RED}错误: 数据库密码不能为空${NC}"
  exit 1
fi

echo -e "${YELLOW}【步骤 2/5】检查 PostgreSQL 服务${NC}"

# 检查 PostgreSQL 是否运行
if ! systemctl is-active --quiet postgresql; then
  echo "PostgreSQL 服务未运行，正在启动..."
  systemctl start postgresql
fi

echo -e "${GREEN}✓ PostgreSQL 服务运行正常${NC}"

echo -e "${YELLOW}【步骤 3/5】创建数据库和用户${NC}"

# 检查数据库是否已存在
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
  echo -e "${YELLOW}数据库 '$DB_NAME' 已存在${NC}"
  read -p "是否删除并重新创建？(y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo -u postgres psql -c "DROP DATABASE $DB_NAME;"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✓ 数据库已重新创建${NC}"
  else
    echo -e "${YELLOW}使用现有数据库${NC}"
  fi
else
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
  echo -e "${GREEN}✓ 数据库创建完成${NC}"
fi

# 检查用户是否存在
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "0")

if [ "$USER_EXISTS" = "1" ]; then
  echo -e "${YELLOW}用户 '$DB_USER' 已存在${NC}"
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
  echo -e "${GREEN}✓ 用户密码已更新${NC}"
else
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
  echo -e "${GREEN}✓ 用户创建完成${NC}"
fi

# 授权
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

echo -e "${GREEN}✓ 权限授权完成${NC}"

echo -e "${YELLOW}【步骤 4/5】导入数据库结构${NC}"

# 查找 SQL 文件
if [ -z "$SQL_FILE" ]; then
  # 查找最新的 SQL 备份文件
  SQL_FILE=$(ls -t /var/www/jy_production_backup_*.sql 2>/dev/null | head -n1)

  if [ -z "$SQL_FILE" ]; then
    # 尝试当前目录
    SQL_FILE=$(ls -t jy_production_backup_*.sql 2>/dev/null | head -n1)
  fi
fi

if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}错误: 找不到 SQL 文件${NC}"
  echo "请使用 -f 参数指定 SQL 文件"
  echo "示例: sudo ./setup-database.sh -f /path/to/backup.sql"
  exit 1
fi

echo "使用 SQL 文件: $SQL_FILE"

# 导入数据
PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -h localhost < "$SQL_FILE"

echo -e "${GREEN}✓ 数据导入完成${NC}"

echo -e "${YELLOW}【步骤 5/5】验证数据库${NC}"

# 检查表数量
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -h localhost -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

echo -e "${GREEN}✓ 数据库包含 $TABLE_COUNT 张表${NC}"

# 显示一些关键表的数据量
echo ""
echo "主要数据表统计:"
PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -h localhost -c "
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
" 2>/dev/null || true

echo ""
echo "========================================"
echo -e "${GREEN}✓ 数据库初始化完成！${NC}"
echo "========================================"
echo ""
echo "数据库信息:"
echo "  数据库名: $DB_NAME"
echo "  用户名: $DB_USER"
echo "  连接字符串: postgresql://$DB_USER:****@localhost:5432/$DB_NAME?schema=public"
echo ""
echo "测试连接:"
PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -h localhost -c "SELECT current_database(), current_user;"
echo ""
