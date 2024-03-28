CREATE TABLE IF NOT EXISTS git_archive (
  timestamp VARCHAR(255) PRIMARY KEY,
  commit_count INTEGER,
  filtered_commit_count INTEGER
);

CREATE TABLE IF NOT EXISTS git_owner (
  name VARCHAR(255) PRIMARY KEY,
  lastupdatetime DATE,
  linkedprojects TEXT[],
  chain VARCHAR(255),
  is_org BOOLEAN,
  ecosystem TEXT[]
);

CREATE TABLE IF NOT EXISTS git_repo (
  name VARCHAR(255),
  full_name VARCHAR(255) PRIMARY KEY,
  owner VARCHAR(255),
  description TEXT,
  language VARCHAR(255),
  fork BOOLEAN,
  forks_count INTEGER,
  html_url VARCHAR(255),
  id INTEGER,
  node_id VARCHAR(255),
  created_at DATE,
  updated_at DATE,
  pushed_at DATE,
  ssh_url VARCHAR(255),
  size INTEGER,
  homepage VARCHAR(255),
  stargazers_count INTEGER,
  watchers_count INTEGER,
  default_branch VARCHAR(255),
  open_issues_count INTEGER,
  has_issues BOOLEAN,
  has_projects BOOLEAN,
  has_wiki BOOLEAN,
  has_pages BOOLEAN,
  has_downloads BOOLEAN,
  archived BOOLEAN,
  disabled BOOLEAN,
  license VARCHAR(255),
  has_discussions BOOLEAN,
  is_template BOOLEAN,
  topics TEXT[],
  tags TEXT[],
  ecosystem TEXT[],
  FOREIGN KEY (owner) REFERENCES git_owner (name) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS git_author (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  CONSTRAINT unique_name_email UNIQUE (name, email)
);

CREATE TABLE IF NOT EXISTS git_commit (
  sha VARCHAR(40) PRIMARY KEY,
  message TEXT,
  repo VARCHAR(255),
  owner VARCHAR(255),
  is_merge_commit BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (repo) REFERENCES git_repo (full_name) ON DELETE SET NULL,
  FOREIGN KEY (owner) REFERENCES git_owner (name) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS git_commit_raw (
  sha VARCHAR(40) PRIMARY KEY,
  message TEXT,
  repo VARCHAR(255),
  owner VARCHAR(255),
  authors JSONB,
  is_merge_commit BOOLEAN,
  is_processed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS git_commit_author (
  commit_sha VARCHAR(40),
  author_id INTEGER,
  PRIMARY KEY (commit_sha, author_id),
  FOREIGN KEY (commit_sha) REFERENCES git_commit (sha) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES git_author (id) ON DELETE CASCADE
);


CREATE INDEX idx_gcr_owner_updatedat ON git_commit_raw(owner, updatedat DESC);
CREATE INDEX idx_gcr_owner ON git_commit_raw(owner);
CREATE index idx_pr_project_id ON project_report(project_id);

CREATE OR REPLACE PROCEDURE project_report_update_commit_time() LANGUAGE plpgsql AS $$
DECLARE
  pr project_report;
BEGIN
-- update last commit time for each project
FOR pr IN SELECT * FROM project_report loop

  UPDATE project_report
    SET last_commit_update_time = (
      SELECT updatedat FROM git_commit_raw WHERE owner = ANY(pr.linked_orgs)
      ORDER BY updatedat DESC
  LIMIT 1
    )
    WHERE project_id = pr.project_id;
    
END LOOP;
END $$;


CREATE OR REPLACE PROCEDURE update_project_reports() LANGUAGE plpgsql AS $$
DECLARE
    pr project_report;
BEGIN
    FOR pr IN SELECT * FROM project_report WHERE (last_commit_update_time > last_report_generated_time + INTERVAL '1 day' OR last_report_generated_time IS NULL) and  (last_commit_update_time IS NOT NULL) LOOP
        UPDATE project_report
        SET report = JSONB_SET(
            JSONB_SET(
                JSONB_SET(
                    JSONB_SET(
                        COALESCE(report, '{}'::jsonb),
                        '{monthly_contributers}',
                        (
                            SELECT jsonb_agg(jsonb_build_object('k', commit_month, 'v', developer_count, 'cc', commit_count))
                            FROM (
                                SELECT commit_month, COUNT(distinct developer) as developer_count, SUM(commit_count) AS commit_count
                                FROM view_agg_contributer_monthly_commits
                                WHERE owner = any(pr.linked_orgs)
                                GROUP BY commit_month
                                ORDER BY commit_month
                            ) AS subquery
                        )
                    ),
                    '{monthly_devs}',
                    (
                        SELECT jsonb_agg(jsonb_build_object('k', commit_month, 'v', developer_count, 'cc', commit_count))
                        FROM (
                            SELECT commit_month, COUNT(distinct developer) as developer_count, SUM(commit_count) AS commit_count
                            FROM view_agg_dev_monthly_commits
                            WHERE owner = any(pr.linked_orgs)
                            GROUP BY commit_month
                            ORDER BY commit_month
                        ) AS subquery
                    )
                ),
                '{weekly_contributers}',
                (
                    SELECT jsonb_agg(jsonb_build_object('k', commit_week, 'v', developer_count, 'cc', commit_count))
                    FROM (
                        SELECT commit_week, COUNT(distinct developer) as developer_count, SUM(commit_count) AS commit_count
                        FROM view_agg_contributer_weekly_commits
                        WHERE owner = any(pr.linked_orgs)
                        GROUP BY commit_week
                        ORDER BY commit_week
                    ) AS subquery
                )
            ),
            '{weekly_devs}',
            (
                SELECT jsonb_agg(jsonb_build_object('k', commit_week, 'v', developer_count, 'cc', commit_count))
                FROM (
                    SELECT commit_week, COUNT(distinct developer) as developer_count, SUM(commit_count) AS commit_count
                    FROM view_agg_dev_weekly_commits
                    WHERE owner = any(pr.linked_orgs)
                    GROUP BY commit_week
                    ORDER BY commit_week
                ) AS subquery
            )
        ),
        last_report_generated_time = CURRENT_DATE,
        exported_to_r2 = false
        WHERE project_id = pr.project_id;
    END LOOP;
END;
$$;
