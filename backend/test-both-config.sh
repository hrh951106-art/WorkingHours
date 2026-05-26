#!/bin/bash

TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "=== 测试：创建同时包含有排班和未排班配置的规则 ==="
curl -s -X POST http://localhost:3001/api/calculate/punch-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "同时配置两种规则",
    "code": "BOTH_CONFIG_001",
    "priority": 1,
    "status": "ACTIVE",
    "scheduledConfig": {
      "punchInterval": 5,
      "workStart": {
        "earlyRange": 120,
        "lateRange": 150,
        "countType": "FIRST",
        "deviceGroupIds": []
      },
      "workEnd": {
        "earlyRange": 120,
        "lateRange": 150,
        "countType": "LAST",
        "deviceGroupIds": []
      }
    },
    "unscheduledConfig": {
      "requirePunch": true,
      "punchInterval": 10,
      "work": {
        "startAfterShiftMins": 480,
        "endBeforeShiftMins": 120,
        "deviceGroupIds": []
      },
      "off": {
        "endBeforeShiftMins": 120,
        "deviceGroupIds": []
      }
    }
  }' | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"创建成功！ID: {d.get('id')}\")
print(f\"有排班配置: {'✅' if d.get('scheduledConfig') else '❌'}\")
print(f\"未排班配置: {'✅' if d.get('unscheduledConfig') else '❌'}\")
"

echo ""
echo "=== 查询验证 ==="
curl -s -X GET "http://localhost:3001/api/calculate/punch-rules" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
rules = json.load(sys.stdin)
for r in rules:
    if r.get('code') == 'BOTH_CONFIG_001':
        print(f\"规则名称: {r.get('name')}\")
        print(f\"有排班配置: {'✅ 存在' if r.get('scheduledConfig') else '❌ 不存在'}\")
        print(f\"未排班配置: {'✅ 存在' if r.get('unscheduledConfig') else '❌ 不存在'}\")
"
