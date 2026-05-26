#!/bin/bash

# 登录
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', ''))" 2>/dev/null)

echo "Token: ${TOKEN:0:50}..."

# 清空旧结果
echo "清理旧分摊结果..."
sqlite3 prisma/dev.db "DELETE FROM AllocationResult WHERE configId = 5;"

# 执行分摊
echo -e "\n执行分摊计算..."
curl -s -X POST http://localhost:3001/api/allocation/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "configId": 5,
    "startDate": "2026-05-14",
    "endDate": "2026-05-14"
  }' | python3 -m json.tool 2>/dev/null || echo "计算响应格式错误"

sleep 2

# 查询结果
echo -e "\n查询分摊结果..."
sqlite3 prisma/dev.db "
SELECT
  sourceEmployeeNo,
  sourceAccountId,
  sourceAccountName,
  sourceHours,
  targetName,
  ROUND(allocatedHours, 2) as allocatedHours
FROM AllocationResult
WHERE configId = 5
ORDER BY id;
"
