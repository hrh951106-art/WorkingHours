#!/bin/bash

# =============================================
# PostgreSQL 种子数据部署脚本
# =============================================
# 功能：自动导入种子数据到PostgreSQL数据库
# 使用：./seed-data-deploy.sh [环境]
# 示例：./seed-data-deploy.sh production
# =============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# 环境参数
ENV=${1:-production}
SQL_FILE="$SCRIPT_DIR/postgresql-seed-data.sql"

# =============================================
# 1. 检查SQL文件是否存在
# =============================================
if [ ! -f "$SQL_FILE" ]; then
    log_error "种子数据SQL文件不存在: $SQL_FILE"
    exit 1
fi

log_info "找到种子数据文件: $SQL_FILE"

# =============================================
# 2. 读取数据库配置
# =============================================
log_info "读取数据库配置..."

if [ ! -f ".env.$ENV" ]; then
    log_warn "未找到 .env.$ENV 文件，尝试使用 .env 文件"
    ENV_FILE=".env"
else
    ENV_FILE=".env.$ENV"
fi

if [ ! -f "$ENV_FILE" ]; then
    log_error "环境配置文件不存在: $ENV_FILE"
    exit 1
fi

# 从.env文件读取数据库配置
DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2-)

if [ -z "$DATABASE_URL" ]; then
    log_error "未找到 DATABASE_URL 配置"
    exit 1
fi

# 解析DATABASE_URL
# 格式: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

log_info "数据库配置:"
echo "  主机: $DB_HOST"
echo "  端口: ${DB_PORT:-5432}"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"

# =============================================
# 3. 测试数据库连接
# =============================================
log_info "测试数据库连接..."

if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "\q" 2>/dev/null; then
    log_error "无法连接到数据库，请检查配置"
    exit 1
fi

log_info "数据库连接成功"

# =============================================
# 4. 备份现有数据（可选）
# =============================================
read -p "是否备份现有数据？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_FILE="$SCRIPT_DIR/seed_backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "备份数据到: $BACKUP_FILE"

    if ! PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"; then
        log_warn "备份失败，但继续执行..."
    else
        log_info "备份完成"
    fi
fi

# =============================================
# 5. 导入种子数据
# =============================================
log_info "开始导入种子数据..."
log_warn "这将插入或更新以下数据："
echo "  - 数据源配置（组织类型、学历、工作状态等）"
echo "  - 人事信息页签配置（5个页签、分组、字段）"
echo "  - 系统用户和角色（admin, hr_admin）"
echo "  - 组织架构（集团总部、技术部、人力资源部）"
echo "  - 班次配置（正常班）"
echo "  - 打卡设备（前台考勤机）"
echo "  - 示例员工（张三、李四）"
echo

read -p "确认导入？(y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "用户取消操作"
    exit 0
fi

log_info "执行SQL导入..."

if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"; then
    log_error "SQL导入失败"
    exit 1
fi

log_info "种子数据导入完成"

# =============================================
# 6. 验证导入结果
# =============================================
log_info "验证导入结果..."

echo
echo "数据统计:"

# 统计各类数据数量
DATA_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"DataSource\";" 2>/dev/null | xargs)
echo "  数据源: $DATA_COUNT"

TAB_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"EmployeeInfoTab\";" 2>/dev/null | xargs)
echo "  页签: $TAB_COUNT"

GROUP_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"EmployeeInfoTabGroup\";" 2>/dev/null | xargs)
echo "  分组: $GROUP_COUNT"

FIELD_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"EmployeeInfoTabField\";" 2>/dev/null | xargs)
echo "  字段: $FIELD_COUNT"

USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | xargs)
echo "  用户: $USER_COUNT"

ROLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Role\";" 2>/dev/null | xargs)
echo "  角色: $ROLE_COUNT"

ORG_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Organization\";" 2>/dev/null | xargs)
echo "  组织: $ORG_COUNT"

SHIFT_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Shift\";" 2>/dev/null | xargs)
echo "  班次: $SHIFT_COUNT"

DEVICE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"PunchDevice\";" 2>/dev/null | xargs)
echo "  设备: $DEVICE_COUNT"

EMPLOYEE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Employee\";" 2>/dev/null | xargs)
echo "  员工: $EMPLOYEE_COUNT"

echo

# =============================================
# 7. 显示默认账户信息
# =============================================
log_info "默认账户信息:"
echo "  管理员 - username: admin / password: admin123"
echo "  HR管理员 - username: hr_admin / password: hr123"
echo
log_warn "生产环境请立即修改默认密码！"

# =============================================
# 完成
# =============================================
log_info "种子数据部署完成！"
