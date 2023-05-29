CREATE TABLE IF NOT EXISTS git_archive (
  timestamp VARCHAR(255) PRIMARY KEY,
  commit_count INTEGER,
  filtered_commit_count INTEGER
);

CREATE TABLE IF NOT EXISTS git_owner (
  name VARCHAR(255) PRIMARY KEY,
  lastUpdateTime DATE,
  linkedProjects TEXT[],
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

