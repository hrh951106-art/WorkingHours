TOKEN=$(cat /tmp/token.txt)
echo "=== Trigger batch punch pairing ==="
curl -s -X POST "http://localhost:3001/api/punch/pairing/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNos": ["202604003"],
    "startDate": "2026-05-12",
    "endDate": "2026-05-12"
  }' | python3 -m json.tool
