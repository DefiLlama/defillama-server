
const TABLES = {
  devAgg: 'view_agg_dev_monthly_commits',
  contributersAgg: 'view_agg_contributer_monthly_commits',
}

const owner_query_contributers = `SELECT
commit_month,
COUNT(DISTINCT developer) AS developer_count
FROM ${TABLES.contributersAgg}
WHERE
owner = :owner
GROUP BY
commit_month
ORDER BY
commit_month ASC;`

const owner_query = `SELECT
commit_month,
COUNT(DISTINCT developer) AS developer_count
FROM ${TABLES.devAgg}
WHERE
owner = :owner
GROUP BY
commit_month
ORDER BY
commit_month ASC;`

module.exports = {
  TABLES,
  owner_query,
  owner_query_contributers,
}