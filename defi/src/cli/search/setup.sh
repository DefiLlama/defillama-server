# Replace SEARCH_MASTER_KEY for the master key from meilisearch
SEARCH_MASTER_KEY=""

curl \
  -X POST 'https://search-core.defillama.com/keys' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  --data-binary '{
    "description": "Search for frontend",
    "actions": ["search"],
    "indexes": ["pages", "directory"],
    "expiresAt": null
  }'

curl \
  -X POST 'https://search-core.defillama.com/indexes/pages/documents'\
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  --data-binary @searchlist.json

curl -X GET 'https://search-core.defillama.com/tasks/0' -H "Authorization: Bearer $SEARCH_MASTER_KEY"

curl \
  -X PUT 'https://search-core.defillama.com/indexes/pages/settings/searchable-attributes' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "symbol",
    "name",
    "previousNames",
    "nameVariants",
    "keywords",
    "subName"
  ]'

curl \
  -X PUT 'https://search-core.defillama.com/indexes/pages/settings/ranking-rules' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "words",
    "typo",
    "proximity",
    "attribute",
    "exactness",
    "r:desc",
    "v:desc",
    "sort"
  ]'

curl \
  -X PUT 'https://search-core.defillama.com/indexes/pages/settings/filterable-attributes' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "type"
  ]'

curl \
  -X PUT 'https://search-core.defillama.com/indexes/pages/settings/sortable-attributes' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "v",
    "tvl",
    "name",
    "mcapRank",
    "r"
  ]'

curl \
  -X PUT 'https://search-core.defillama.com/indexes/pages/settings/displayed-attributes' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "id",
    "name",
    "type",
    "logo",
    "route",
    "deprecated",
    "hideType",
    "previousNames",
    "subName",
    "symbol"
  ]'

# --- Directory index setup ---

curl \
  -X PUT 'https://search-core.defillama.com/indexes/directory/settings/ranking-rules' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "words",
    "typo",
    "proximity",
    "attribute",
    "exactness",
    "r:desc",
    "v:desc",
    "sort"
  ]'

curl \
  -X PUT 'https://search-core.defillama.com/indexes/directory/settings/displayed-attributes' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "name",
    "symbol",
    "logo",
    "route",
    "deprecated",
    "previousNames"
  ]'

curl \
  -X PUT 'https://search-core.defillama.com/indexes/directory/settings/searchable-attributes' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "symbol",
    "name",
    "previousNames",
    "nameVariants",
    "route"
  ]'

curl \
  -X PUT 'https://search-core.defillama.com/indexes/directory/settings/sortable-attributes' \
  -H "Authorization: Bearer $SEARCH_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "v",
    "tvl",
    "name",
    "r"
  ]'
