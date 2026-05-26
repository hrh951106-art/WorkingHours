#!/bin/bash

TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "=== 测试1: 创建新规则 ==="
curl -s -X POST http://localhost:3001/api/calculate/punch-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试唯一性",
    "code": "UNIQUE_TEST_999",
    "ruleType": "scheduled",
    "priority": 1,
    "status": "ACTIVE",
    "scheduledConfig": {
      "punchInterval": 0,
      "workStart": {"earlyRange": 0, "lateRange": 0, "countType": "FIRST", "deviceGroupIds": []},
      "workEnd": {"earlyRange": 0, "lateRange": 0, "countType": "LAST", "deviceGroupIds": []}
    }
  }'

echo ""
echo "=== 测试2: 使用相同 code 创建 ==="
curl -s -X POST http://localhost:3001/api/calculate/punch-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试唯一性2",
    "code": "UNIQUE_TEST_999",
    "ruleType": "scheduled",
    "priority": 1,
    "status": "ACTIVE",
    "scheduledConfig": {
      "punchInterval": 0,
      "workStart": {"earlyRange": 0, "lateRange": 0, "countType": "FIRST", "deviceGroupIds": []},
      "workEnd": {"earlyRange": 0, "lateRange": 0, "countType": "LAST", "deviceGroupIds": []}
    }
  }'
