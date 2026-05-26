#!/bin/bash

# 工作流审批人修复测试脚本
# 用于测试审批人查找逻辑和无审批人处理逻辑

BASE_URL="http://localhost:3001"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWg-k_lHehW_Fto9hRT0nFlUT_mo"

echo "========================================"
echo "工作流审批人修复测试"
echo "========================================"
echo ""

# 1. 创建工时报工申请（会触发工作流）
echo "1. 创建工时报工申请..."
curl -s -X POST "${BASE_URL}/api/labor-hour-report/requests" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试审批人修复",
    "reportMode": "personal",
    "employeeId": 11,
    "employeeNo": "202605009",
    "employeeName": "测试员工2",
    "reportDate": "2026-05-26",
    "hourType": "A04",
    "hourTypeName": "出勤工时",
    "startTime": "08:00",
    "endTime": "12:00",
    "value": 4,
    "unit": "HOURS",
    "accountId": 15,
    "accountCode": "AUTO-1779768598348",
    "accountName": "喷漆",
    "requesterId": 1,
    "requesterName": "系统管理员"
  }' | python3 -m json.tool

echo ""
echo ""

# 2. 查询最新的工时报工申请
echo "2. 查询最新的工时报工申请..."
curl -s "${BASE_URL}/api/labor-hour-report/requests?page=1&pageSize=1" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool

echo ""
echo ""

# 3. 获取工作流实例详情（假设实例ID为10）
echo "3. 获取工作流实例详情..."
curl -s "${BASE_URL}/api/workflow/instances/10" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool

echo ""
echo ""

# 4. 测试管理员强制跳过节点的功能（如果需要）
# curl -s -X POST "${BASE_URL}/api/workflow/instances/10/force-skip/5" \
#   -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"
