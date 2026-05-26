TOKEN=$(cat /tmp/token.txt)
echo "=== Calculate 2026-05-11 (No Schedule) ==="
curl -s -X POST "http://localhost:3001/api/calculate/attendance-work-hours/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNo": "202604003",
    "calcDate": "2026-05-11"
  }' | python3 -m json.tool
