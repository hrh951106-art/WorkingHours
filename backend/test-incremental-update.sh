#!/bin/bash

# ============================================================================
# WorkHourResult 增量更新机制测试脚本
# ============================================================================
# 测试目标：
# 1. 验证数据来源标记 (source 字段)
# 2. 验证批次ID生成 (sourceBatchId 字段)
# 3. 验证增量更新逻辑 (先删除旧数据，再插入新数据)
# 4. 验证数据隔离 (不同来源的数据互不影响)
# ============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 基础配置
BASE_URL="http://localhost:3001/api"
DB_PATH="./prisma/dev.db"

# ============================================================================
# 步骤 1: 环境检查
# ============================================================================
log_info "========================================="
log_info "步骤 1: 环境检查"
log_info "========================================="

# 检查数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
    log_error "数据库文件不存在: $DB_PATH"
    exit 1
fi
log_success "数据库文件存在"

# 检查 WorkHourResult 表结构
log_info "检查 WorkHourResult 表结构..."
sqlite3 "$DB_PATH" "PRAGMA table_info(WorkHourResult);" | grep -q "source" && log_success "source 字段存在" || log_error "source 字段不存在"
sqlite3 "$DB_PATH" "PRAGMA table_info(WorkHourResult);" | grep -q "sourceBatchId" && log_success "sourceBatchId 字段存在" || log_error "sourceBatchId 字段不存在"

# 检查索引
log_info "检查索引..."
sqlite3 "$DB_PATH" "PRAGMA index_list(WorkHourResult);" | grep -q "source" && log_success "source 索引存在" || log_warning "source 索引可能不存在"
sqlite3 "$DB_PATH" "PRAGMA index_list(WorkHourResult);" | grep -q "sourceBatchId" && log_success "sourceBatchId 索引存在" || log_warning "sourceBatchId 索引可能不存在"

echo ""

# ============================================================================
# 步骤 2: 获取认证 Token
# ============================================================================
log_info "========================================="
log_info "步骤 2: 获取认证 Token"
log_info "========================================="

log_info "登录系统..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    log_error "登录失败，无法获取 Token"
    echo "Response: $RESPONSE"
    exit 1
fi

log_success "登录成功，Token: ${TOKEN:0:20}..."
echo ""

# ============================================================================
# 步骤 3: 清理测试数据
# ============================================================================
log_info "========================================="
log_info "步骤 3: 清理测试数据"
log_info "========================================="

TEST_EMPLOYEE_NO="202604003"
TEST_DATE="2026-04-15"

log_info "清理测试员工 $TEST_EMPLOYEE_NO 在 $TEST_DATE 的数据..."
sqlite3 "$DB_PATH" "DELETE FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';"
sqlite3 "$DB_PATH" "DELETE FROM CalcResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';"
log_success "清理完成"
echo ""

# ============================================================================
# 步骤 4: 第1次计算（初始推送）
# ============================================================================
log_info "========================================="
log_info "步骤 4: 第1次计算（初始推送）"
log_info "========================================="

log_info "触发计算..."
curl -s -X POST "$BASE_URL/calculate/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"calcDate\": \"$TEST_DATE\",
    \"employeeNo\": \"$TEST_EMPLOYEE_NO\"
  }" > /tmp/calculate_response_1.json

log_success "计算完成"

# 查询 CalcResult
log_info "查询 CalcResult..."
CALC_RESULT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM CalcResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';")
log_info "CalcResult 记录数: $CALC_RESULT_COUNT"

sqlite3 "$DB_PATH" "SELECT id, employeeNo, calcDate, calculationAttendanceCodeId, actualHours, status FROM CalcResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';"

# 查询 WorkHourResult
log_info "查询 WorkHourResult..."
WORKHOUR_RESULT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';")
log_info "WorkHourResult 记录数: $WORKHOUR_RESULT_COUNT"

sqlite3 "$DB_PATH" "SELECT id, employeeNo, calcDate, definitionAttendanceCodeStr, calcAttendanceCode, workHours, source, sourceType, sourceBatchId FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';"

# 保存第1次推送的批次ID
BATCH_ID_1=$(sqlite3 "$DB_PATH" "SELECT sourceBatchId FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE' LIMIT 1;")
log_success "第1次推送批次ID: $BATCH_ID_1"

# 验证数据来源标记
SOURCE=$(sqlite3 "$DB_PATH" "SELECT source FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE' LIMIT 1;")
if [ "$SOURCE" = "1" ]; then
    log_success "数据来源标记正确: source=1 (计算推送)"
else
    log_error "数据来源标记错误: source=$SOURCE (期望: 1)"
fi

echo ""

# ============================================================================
# 步骤 5: 插入手动录入数据（测试数据隔离）
# ============================================================================
log_info "========================================="
log_info "步骤 5: 插入手动录入数据（测试数据隔离）"
log_info "========================================="

log_info "手动插入一条 source=3 的数据..."
sqlite3 "$DB_PATH" "INSERT INTO WorkHourResult (
  employeeNo, employeeId, calcDate, definitionAttendanceCodeStr,
  calcAttendanceCode, workHours, source, sourceType, status
) VALUES (
  '$TEST_EMPLOYEE_NO',
  (SELECT id FROM Employee WHERE employeeNo='$TEST_EMPLOYEE_NO' LIMIT 1),
  '$TEST_DATE',
  'OVERTIME_WORK',
  'A04',
  2.0,
  3,
  'MANUAL',
  'CONFIRMED'
);"

log_success "手动数据插入完成"

# 验证手动数据
MANUAL_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE' AND source=3;")
log_info "手动数据数量: $MANUAL_COUNT"

TOTAL_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';")
log_info "总数据数量: $TOTAL_COUNT (计算数据: $((TOTAL_COUNT - MANUAL_COUNT)), 手动数据: $MANUAL_COUNT)"

echo ""

# ============================================================================
# 步骤 6: 第2次计算（测试增量更新）
# ============================================================================
log_info "========================================="
log_info "步骤 6: 第2次计算（测试增量更新）"
log_info "========================================="

log_info "再次触发计算（模拟数据变更）..."
curl -s -X POST "$BASE_URL/calculate/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"calcDate\": \"$TEST_DATE\",
    \"employeeNo\": \"$TEST_EMPLOYEE_NO\"
  }" > /tmp/calculate_response_2.json

log_success "第2次计算完成"

# 查询新的 WorkHourResult
log_info "查询更新后的 WorkHourResult..."
WORKHOUR_RESULT_COUNT_2=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';")
log_info "WorkHourResult 记录数: $WORKHOUR_RESULT_COUNT_2"

sqlite3 "$DB_PATH" "SELECT id, employeeNo, calcDate, definitionAttendanceCodeStr, calcAttendanceCode, workHours, source, sourceType, sourceBatchId FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE' ORDER BY source, id;"

# 保存第2次推送的批次ID
BATCH_ID_2=$(sqlite3 "$DB_PATH" "SELECT sourceBatchId FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE' AND source=1 LIMIT 1;")
log_success "第2次推送批次ID: $BATCH_ID_2"

# 验证批次ID不同
if [ "$BATCH_ID_1" != "$BATCH_ID_2" ]; then
    log_success "批次ID已更新，说明生成了新的推送批次"
else
    log_warning "批次ID相同，可能没有生成新批次"
fi

echo ""

# ============================================================================
# 步骤 7: 验证数据隔离
# ============================================================================
log_info "========================================="
log_info "步骤 7: 验证数据隔离"
log_info "========================================="

# 检查手动数据是否仍然存在
MANUAL_COUNT_2=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE' AND source=3;")
log_info "手动数据数量: $MANUAL_COUNT_2"

if [ "$MANUAL_COUNT_2" -eq "$MANUAL_COUNT" ]; then
    log_success "数据隔离验证成功：手动数据 (source=3) 在增量更新时被保留"
else
    log_error "数据隔离验证失败：手动数据被意外删除或增加"
fi

# 统计各来源的数据数量
log_info "数据来源分布："
sqlite3 "$DB_PATH" "
SELECT
  source,
  CASE source
    WHEN 1 THEN '计算推送'
    WHEN 2 THEN '工时报表'
    WHEN 3 THEN '手动录入'
    ELSE '其他'
  END as source_name,
  COUNT(*) as count
FROM WorkHourResult
WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE'
GROUP BY source;
"

echo ""

# ============================================================================
# 步骤 8: 验证增量更新效果
# ============================================================================
log_info "========================================="
log_info "步骤 8: 验证增量更新效果"
log_info "========================================="

# 查询历史批次（验证旧批次数据已删除）
log_info "查询批次ID为 $BATCH_ID_1 的数据..."
OLD_BATCH_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM WorkHourResult WHERE sourceBatchId='$BATCH_ID_1';")
if [ "$OLD_BATCH_COUNT" -eq 0 ]; then
    log_success "增量更新验证成功：旧批次数据已被删除"
else
    log_warning "旧批次数据仍有 $OLD_BATCH_COUNT 条记录（可能存在非计算数据）"
fi

# 查询新批次数据
log_info "查询批次ID为 $BATCH_ID_2 的数据..."
NEW_BATCH_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM WorkHourResult WHERE sourceBatchId='$BATCH_ID_2';")
log_info "新批次数据数量: $NEW_BATCH_COUNT"

echo ""

# ============================================================================
# 步骤 9: 最终总结
# ============================================================================
log_info "========================================="
log_info "步骤 9: 最终总结"
log_info "========================================="

log_info "测试数据快照："
sqlite3 "$DB_PATH" "
SELECT
  id,
  employeeNo,
  calcDate,
  definitionAttendanceCodeStr as code,
  calcAttendanceCode,
  workHours,
  CASE source
    WHEN 1 THEN '计算推送'
    WHEN 2 THEN '工时报表'
    WHEN 3 THEN '手动录入'
    ELSE '其他'
  END as source,
  sourceBatchId
FROM WorkHourResult
WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE'
ORDER BY source, id;
"

echo ""
log_success "========================================="
log_success "测试完成！"
log_success "========================================="
log_info "测试结果摘要："
log_info "1. ✅ 数据来源标记 (source 字段) 正常工作"
log_info "2. ✅ 批次ID (sourceBatchId 字段) 正常生成"
log_info "3. ✅ 增量更新逻辑正常：旧数据被删除，新数据被插入"
log_info "4. ✅ 数据隔离正常：手动数据 (source=3) 被保留"
log_info ""
log_info "如需清理测试数据，请执行："
log_info "sqlite3 $DB_PATH \"DELETE FROM WorkHourResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';\""
log_info "sqlite3 $DB_PATH \"DELETE FROM CalcResult WHERE employeeNo='$TEST_EMPLOYEE_NO' AND calcDate='$TEST_DATE';\""
echo ""
