TOKEN=$(cat /tmp/token.txt)
echo "=== Calculate attendance work hours ==="
curl -s -X POST "http://localhost:3001/api/calculate/attendance-work-hours/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNo": "202604003",
    "calcDate": "2026-05-12"
  }' | python3 -m json.tool
