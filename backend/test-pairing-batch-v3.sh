TOKEN=$(cat /tmp/token.txt)
echo "=== Trigger batch punch pairing (single date) ==="
curl -s -X POST "http://localhost:3001/api/punch/pairing/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pairDate": "2026-05-12",
    "employeeNos": ["202604003"]
  }' | python3 -m json.tool
