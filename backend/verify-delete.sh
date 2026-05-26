#!/bin/bash

echo "=== 验证 CalcResult 删除结果 ==="
echo ""

# 登录获取token
TOKEN=$(curl -s -X POST 'http://localhost:3001/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

echo "1. 通过 API 查询工时结果..."
echo "----------------------------------------"
curl -s "http://localhost:3001/api/allocation/work-hours?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" | python3 << 'PYTHON'
import sys, json
data = json.load(sys.stdin)
if data['success']:
    total = data['data']['total']
    if total == 0:
        print("✓ API查询确认：工时结果已清空")
    else:
        print(f"⚠ 仍有 {total} 条记录")
else:
    print("API查询失败")
PYTHON

echo ""
echo "2. 直接查询数据��..."
echo "----------------------------------------"
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const count = await prisma.calcResult.count();
  console.log('数据库记录数:', count);
  if (count === 0) {
    console.log('✓ 数据库确认：CalcResult 表已清空');
  }
  await prisma.\$disconnect();
})();
"

echo ""
echo "=== 删除验证完成 ==="

