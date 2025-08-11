# Replace MASTER_KEY for the master key from meilisearch
MASTER_KEY=""

# Add key
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

# Add documents
curl \
  -X POST 'https://search.defillama.com/indexes/pages/documents'\
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MASTER_KEY" \
  --data-binary @searchPages.json

# Get task status
curl -X GET 'https://search.defillama.com/tasks/0' -H "Authorization: Bearer $MASTER_KEY"

# Set searchable attributes
curl \
  -X PUT 'https://search.defillama.com/indexes/pages/settings/searchable-attributes' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "category",
    "pages.name",
    "pages.symbol"
  ]'

# Set ranking rules
curl \
  -X PUT 'https://search.defillama.com/indexes/pages/settings/ranking-rules' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "words",
    "pages.v:desc",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness"
  ]'
