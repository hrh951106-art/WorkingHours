#!/bin/bash

# 获取token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
echo ""

# 测试1: 不填description
echo "测试1: description为空字符串"
curl -X POST http://localhost:3001/api/support/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "supportMode": "FULL_DAY",
    "supportEmployeeId": 1,
    "supportEmployeeName": "系统管理员",
    "supportEmployeeNo": "admin",
    "supportAccountId": 1,
    "supportAccountName": "测试账户",
    "description": "",
    "calculatedHours": 8,
    "startDate": "2026-04-13",
    "endDate": "2026-04-13"
  }' 2>&1 | grep -v "Total\|Dload\|speed"
echo -e "\n---\n"

# 测试2: description不存在
echo "测试2: 不传description字段"
curl -X POST http://localhost:3001/api/support/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "supportMode": "FULL_DAY",
    "supportEmployeeId": 1,
    "supportEmployeeName": "系统管理员",
    "supportEmployeeNo": "admin",
    "supportAccountId": 1,
    "supportAccountName": "测试账户",
    "calculatedHours": 8,
    "startDate": "2026-04-13",
    "endDate": "2026-04-13"
  }' 2>&1 | grep -v "Total\|Dload\|speed"
echo -e "\n---\n"

# 测试3: description为null
echo "测试3: description为null"
curl -X POST http://localhost:3001/api/support/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "supportMode": "FULL_DAY",
    "supportEmployeeId": 1,
    "supportEmployeeName": "系统管理员",
    "supportEmployeeNo": "admin",
    "supportAccountId": 1,
    "supportAccountName": "测试账户",
    "description": null,
    "calculatedHours": 8,
    "startDate": "2026-04-13",
    "endDate": "2026-04-13"
  }' 2>&1 | grep -v "Total\|Dload\|speed"
