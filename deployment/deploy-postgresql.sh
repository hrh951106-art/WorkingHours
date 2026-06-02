#!/bin/bash

# =============================================
# PostgreSQL 生产环境一键部署脚本
# =============================================
# 功能：自动完成PostgreSQL生产环境的完整部署
# 包含：数据库创建、schema迁移、种子数据导入、验证
# =============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# =============================================
# 配置变量
# =============================================
DB_NAME="${DB_NAME:-jy_production}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 检查项目根目录
if [ ! -f "$PROJECT_ROOT/backend/prisma/schema.prisma" ]; then
    log_error "无法找到项目根目录: $PROJECT_ROOT"
    exit 1
fi

log_info "项目根目录: $PROJECT_ROOT"

# =============================================
# 步骤1：检查Prisma Provider
# =============================================
log_step "步骤1：检查Prisma Provider"

if grep -q 'provider = "sqlite"' "$PROJECT_ROOT/backend/prisma/schema.prisma"; then
    log_error "Provider仍为sqlite，请先运行以下命令修改："
    echo "  cd backend/prisma"
    echo "  sed -i.bak 's/provider = \"sqlite\"/provider = \"postgresql\"/' schema.prisma"
    exit 1
fi

log_info "✅ Provider已正确设置为postgresql"

# =============================================
# 步骤2：检查数据库连接
# =============================================
log_step "步骤2：检查数据库连接"

export PGPASSWORD="$DB_PASSWORD"

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "SELECT 1" > /dev/null 2>&1; then
    log_error "无法连接到PostgreSQL服务器"
    log_error "连接信息：host=$DB_HOST, port=$DB_PORT, user=$DB_USER"
    exit 1
fi

log_info "✅ 数据库连接成功"

# =============================================
# 步骤3：创建数据库
# =============================================
log_step "步骤3：创建数据库"

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log_warn "数据库 $DB_NAME 已存在"
    read -p "是否删除并重新创建？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "删除现有数据库..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE $DB_NAME;"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME ENCODING 'UTF8';"
        log_info "✅ 数据库已重新创建"
    else
        log_info "使用现有数据库"
    fi
else
    log_info "创建数据库 $DB_NAME..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME ENCODING 'UTF8';"
    log_info "✅ 数据库创建成功"
fi

# =============================================
# 步骤4：配置环境变量
# =============================================
log_step "步骤4：配置环境变量"

cd "$PROJECT_ROOT/backend"

export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"

cat > .env.production << EOF
DATABASE_URL="$DATABASE_URL"
NODE_ENV="production"
PORT="3000"
EOF

log_info "✅ 环境变量已配置"

# =============================================
# 步骤5：生成Prisma客户端
# =============================================
log_step "步骤5：生成Prisma客户端"

if [ ! -d "node_modules" ]; then
    log_info "安装依赖..."
    npm install
fi

rm -rf node_modules/.prisma
npx prisma generate

log_info "✅ Prisma客户端已生成"

# =============================================
# 步骤6：应用数据库迁移
# =============================================
log_step "步骤6：应用数据库迁移"

read -p "选择迁移方式：
  1. migrate dev (创建迁移文件，推荐)
  2. db push (直接推送schema，快速)
  [1/2]: " -n 1 -r MIGRATION_CHOICE
echo

if [ "$MIGRATION_CHOICE" = "2" ]; then
    log_info "使用 db push 方式..."
    npx prisma db push
else
    log_info "使用 migrate dev 方式..."
    read -p "迁移名称 (默认: init_postgresql): " MIGRATION_NAME
    MIGRATION_NAME=${MIGRATION_NAME:-init_postgresql}

    npx prisma migrate dev --name "$MIGRATION_NAME" || {
        log_warn "migrate dev失败，尝试使用db push..."
        npx prisma db push
    }
fi

log_info "✅ 数据库迁移完成"

# =============================================
# 步骤7：导入种子数据
# =============================================
log_step "步骤7：导入种子数据"

cd "$PROJECT_ROOT/deployment"

read -p "是否导入种子数据？(y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f postgresql-seed-data.sql

    log_info "✅ 种子数据导入完成"
else
    log_warn "跳过种子数据导入"
fi

# =============================================
# 步骤8：验证部署
# =============================================
log_step "步骤8：验证部署"

echo ""
echo "数据库结构验证："

TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
" | xargs)

echo "  表数量: $TABLE_COUNT (预期: 87)"

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT COUNT(*) FROM \"DataSource\";
" > /dev/null 2>&1; then
    echo "  种子数据: 已导入"

    echo ""
    echo "数据统计："
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT
        '数据源' as name, COUNT(*) as count FROM \"DataSource\" UNION ALL
        SELECT '用户', COUNT(*) FROM \"User\" UNION ALL
        SELECT '角色', COUNT(*) FROM \"Role\" UNION ALL
        SELECT '组织', COUNT(*) FROM \"Organization\" UNION ALL
        SELECT '员工', COUNT(*) FROM \"Employee\" UNION ALL
        SELECT '页签', COUNT(*) FROM \"EmployeeInfoTab\";
    " | while IFS='|' read -r name count; do
        printf "  %-20s: %s\n" "$name" "$count"
    done
else
    echo "  种子数据: 未导入"
fi

# =============================================
# 完成
# =============================================
log_step "部署完成"

echo ""
echo "📋 部署信息："
echo "  数据库: $DB_NAME"
echo "  主机: $DB_HOST:$DB_PORT"
echo "  Schema: public"
echo ""
echo "📝 下一步："
echo "  1. 修改默认用户密码"
echo "  2. 启动应用: cd backend && npm run dev"
echo "  3. 访问应用: http://localhost:3000"
echo ""
echo "默认账户："
echo "  管理员: admin / admin123"
echo "  HR管理员: hr_admin / hr123"
echo ""
log_warn "⚠️  请立即修改默认密码！"
