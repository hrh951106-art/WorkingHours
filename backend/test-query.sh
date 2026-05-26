#!/bin/bash

TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "=== 查询所有打卡规则 ==="
curl -s -X GET "http://localhost:3001/api/calculate/punch-rules" \
  -H "Authorization: Bearer $TOKEN" > /tmp/rules.json

python3 << 'EOF'
import json

with open('/tmp/rules.json', 'r') as f:
    rules = json.load(f)

print(f'总规则数: {len(rules)}')
print()

for r in rules:
    has_scheduled = r.get('scheduledConfig') is not None
    has_unscheduled = r.get('unscheduledConfig') is not None
    rule_type = r.get('ruleType')

    print(f"{r.get('name')} ({r.get('code')})")
    print(f"  - ruleType: {rule_type}")
    print(f"  - 有排班配置: {'✅' if has_scheduled else '❌'}")
    print(f"  - 未排班配置: {'✅' if has_unscheduled else '❌'}")

    if has_scheduled or has_unscheduled:
        print(f"  → 应显示在: 考勤打卡规则列表")
    else:
        print(f"  → 应显示在: 精益打卡规则列表")
    print()

print("=== 考勤打卡规则列表过滤结果 ===")
attendance_rules = [r for r in rules if r.get('scheduledConfig') is not None or r.get('unscheduledConfig') is not None]
print(f'数量: {len(attendance_rules)}')
for r in attendance_rules:
    print(f"  - {r.get('name')} ({r.get('code')})")
EOF
