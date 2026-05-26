#!/bin/bash

# 测试统一查询条件配置保存API

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWg-k_lHehW_Fto9hRT0nFlUT_mo"

BASE_URL="http://localhost:3001"

echo "=== 测试保存统一查询条件配置 ==="

curl -X POST "${BASE_URL}/hr/unified-search-condition-configs/batch" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "configs": [
      {
        "configCode": "test_config",
        "configName": "测试配置",
        "pageCode": "employee-list",
        "pageName": "员工列表",
        "fieldCode": "employeeNo",
        "fieldName": "工号",
        "fieldType": "text",
        "isEnabled": true,
        "sortOrder": 0,
        "applicablePages": "[\"employee-list\", \"schedule-management\"]"
      }
    ]
  }'

echo ""
echo "=== 测试完成 ==="
