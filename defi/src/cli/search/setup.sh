# Replace MASTER_KEY for the master key from meilisearch
MASTER_KEY=""

curl \
  -X POST 'https://search.defillama.com/keys' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MASTER_KEY" \
  --data-binary '{
    "description": "Search for frontend",
    "actions": ["search"],
    "indexes": ["protocols"],
    "expiresAt": null
  }'

curl \
  -X POST 'https://search.defillama.com/indexes/protocols/documents'\
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MASTER_KEY" \
  --data-binary @searchProtocols.json

curl -X GET 'https://search.defillama.com/tasks/0' -H "Authorization: Bearer $MASTER_KEY"

curl \
  -X PUT 'https://search.defillama.com/indexes/protocols/settings/ranking-rules' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
	"words",
  "tvl:desc",
	"typo",
	"proximity",
	"attribute",
	"sort",
	"exactness"
]'
