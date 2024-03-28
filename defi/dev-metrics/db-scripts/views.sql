CREATE VIEW view_agg_dev_monthly_commits AS
SELECT
  author->>'name' AS developer,
  COUNT(*) AS commit_count,
  DATE_TRUNC('month', gcr.created_at) AS commit_month,
  gcr.repo AS repo,
  gcr.owner AS owner
FROM
    git_commit_raw gcr,
    JSONB_ARRAY_ELEMENTS(authors) AS author
GROUP BY
  developer,
  commit_month,
  repo,
  owner
HAVING
  COUNT(DATE_TRUNC('month', gcr.created_at) ) >= 3


CREATE VIEW view_agg_contributer_monthly_commits AS
SELECT
  author->>'name' AS developer,
  COUNT(*) AS commit_count,
  DATE_TRUNC('month', gcr.created_at) AS commit_month,
  gcr.repo AS repo,
  gcr.owner AS owner
FROM
    git_commit_raw gcr,
    JSONB_ARRAY_ELEMENTS(authors) AS author
GROUP BY
  developer,
  commit_month,
  repo,
  owner

CREATE VIEW view_agg_dev_weekly_commits AS
SELECT
  author->>'name' AS developer,
  COUNT(*) AS commit_count,
  DATE_TRUNC('week', gcr.created_at) AS commit_week,
  gcr.repo AS repo,
  gcr.owner AS owner
FROM
    git_commit_raw gcr,
    JSONB_ARRAY_ELEMENTS(authors) AS author
GROUP BY
  developer,
  commit_week,
  repo,
  owner
HAVING
  COUNT(DATE_TRUNC('month', gcr.created_at) ) >= 3


CREATE VIEW view_agg_contributer_weekly_commits AS
SELECT
  author->>'name' AS developer,
  COUNT(*) AS commit_count,
  DATE_TRUNC('week', gcr.created_at) AS commit_week,
  gcr.repo AS repo,
  gcr.owner AS owner
FROM
    git_commit_raw gcr,
    JSONB_ARRAY_ELEMENTS(authors) AS author
GROUP BY
  developer,
  commit_week,
  repo,
  owner