#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJuYW1lIjoi57O757uf566h55CG5ZGYIiwiaWF0IjoxNzc4NzI5MTMwLCJleHAiOjE3NzkzMzM5MzB9.RfWPzGenObU8RHAQyWAohCTjtES7j2cMNCHT--fQotk"

for pairId in 107 108 109 110; do
  echo "计算摆卡 ID: $pairId"
  curl -X POST "http://localhost:3001/api/calculate/attendance-codes/$pairId/calculate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -s
  echo ""
  echo ""
  sleep 1
done
