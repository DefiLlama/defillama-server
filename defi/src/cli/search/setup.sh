# Replace MASTER_KEY for the master key from meilisearch
MASTER_KEY=""

curl \
  -X POST 'https://search.defillama.com/keys' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MASTER_KEY" \
  --data-binary '{
    "description": "Search for frontend",
    "actions": ["search"],
    "indexes": ["pages"],
    "expiresAt": null
  }'

curl \
  -X POST 'https://search.defillama.com/indexes/pages/documents'\
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MASTER_KEY" \
  --data-binary @searchlist.json

curl -X GET 'https://search.defillama.com/tasks/0' -H "Authorization: Bearer $MASTER_KEY"

curl \
  -X PUT 'https://search.defillama.com/indexes/pages/settings/searchable-attributes' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "name",
    "symbol",
    "type"
  ]'

curl \
  -X PUT 'https://search.defillama.com/indexes/pages/settings/ranking-rules' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "words",
    "v:desc",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness"
  ]'

curl \
  -X PUT 'https://search.defillama.com/indexes/pages/settings/filterable-attributes' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "type"
  ]'

curl \
  -X PUT 'https://search.defillama.com/indexes/pages/settings/sortable-attributes' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "v",
    "tvl",
    "name"
  ]'

curl \
  -X PUT 'https://search.defillama.com/indexes/pages/settings/displayed-attributes' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "id",
    "name",
    "type",
    "logo",
    "route",
    "deprecated"
  ]'