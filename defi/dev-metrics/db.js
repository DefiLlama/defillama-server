const { Sequelize, Model, DataTypes } = require('sequelize');

const sequelize = new Sequelize('dev-metrics', 'llama', process.env.PG_DB_PASSWORD, {
  host: 'localhost',
  dialect: 'postgres',
  logging: (msg) => {
    // Log only error messages
    if (msg.includes('ERROR')) {
      if (msg.includes('CREATE OR REPLACE FUNCTION') && msg.includes('git_commit_raw') && msg.includes('unique_violation')) return;
      console.error(msg);
    }
  },
});

class GitCommitRaw extends Model {}
GitCommitRaw.init(
  {
    sha: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    repo: DataTypes.STRING,
    owner: DataTypes.STRING,
    authors: DataTypes.JSONB,
    is_merge_commit: DataTypes.BOOLEAN,
    is_processed: DataTypes.BOOLEAN,
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'git_commit_raw',
    timestamps: true,
  }
);

class GitCommitAuthor extends Model {}
GitCommitAuthor.init(
  {
    commit_sha: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    author_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    sequelize,
    tableName: 'git_commit_author',
    timestamps: true,
  }
);

class GitArchive extends Model {}
GitArchive.init(
  {
    archive_file: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    commit_count: DataTypes.INTEGER,
    filtered_commit_count: DataTypes.INTEGER,
  },
  {
    sequelize,
    tableName: 'git_archive',
    timestamps: true,
  }
);

class GitOwner extends Model {}
GitOwner.init(
  {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    lastUpdateTime: DataTypes.DATE,
    linkedProjects: DataTypes.ARRAY(DataTypes.STRING),
    is_org: DataTypes.BOOLEAN,
    ecosystem: DataTypes.ARRAY(DataTypes.STRING),
  },
  {
    sequelize,
    tableName: 'git_owner',
    timestamps: true,
  }
);

class GitRepo extends Model {}
GitRepo.init(
  {
    name: DataTypes.STRING,
    full_name: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    owner: {
      type: DataTypes.STRING,
    },
    description: DataTypes.TEXT,
    language: DataTypes.STRING,
    fork: DataTypes.BOOLEAN,
    forks_count: DataTypes.INTEGER,
    html_url: DataTypes.STRING,
    id: DataTypes.INTEGER,
    node_id: DataTypes.STRING,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    pushed_at: DataTypes.DATE,
    ssh_url: DataTypes.STRING,
    size: DataTypes.INTEGER,
    homepage: DataTypes.STRING,
    stargazers_count: DataTypes.INTEGER,
    watchers_count: DataTypes.INTEGER,
    default_branch: DataTypes.STRING,
    open_issues_count: DataTypes.INTEGER,
    has_issues: DataTypes.BOOLEAN,
    has_projects: DataTypes.BOOLEAN,
    has_wiki: DataTypes.BOOLEAN,
    has_pages: DataTypes.BOOLEAN,
    has_downloads: DataTypes.BOOLEAN,
    archived: DataTypes.BOOLEAN,
    disabled: DataTypes.BOOLEAN,
    license: DataTypes.JSONB,
    has_discussions: DataTypes.BOOLEAN,
    is_template: DataTypes.BOOLEAN,
    topics: DataTypes.ARRAY(DataTypes.STRING),
    tags: DataTypes.ARRAY(DataTypes.STRING),
    ecosystem: DataTypes.ARRAY(DataTypes.STRING),
  },
  {
    sequelize,
    tableName: 'git_repo',
    timestamps: true,
  }
);

class GitAuthor extends Model {}
GitAuthor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
  },
  {
    sequelize,
    tableName: 'git_author',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'email'],
      },
    ],
  }
);

class GitCommit extends Model {}
GitCommit.init(
  {
    sha: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    message: DataTypes.TEXT,
    repo: {
      type: DataTypes.STRING,
      references: {
        model: 'git_repo',
        key: 'full_name',
      },
      onDelete: 'SET NULL',
    },
    owner: {
      type: DataTypes.STRING,
      references: {
        model: 'git_owner',
        key: 'name',
      },
      onDelete: 'SET NULL',
    },
    is_merge_commit: DataTypes.BOOLEAN,
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'git_commit',
    timestamps: true,
  }
);

/**
 * Add a raw commit to the database if it doesn't exist
 * @param {*} commit - the raw commit object
 * @returns {Promise<GitCommitRaw>}
 */
async function addRawCommit(commit) {
  return GitCommitRaw.findOrCreate({ where: { sha: commit.sha }, defaults: commit })
}

/**
 * Check if an archive data is already pulled exists for a given archive_file
 * @param {String} archive_file   
 * @returns {Promise<Boolean>}
 */
async function archiveExists(archive_file) {
  return !!(await GitArchive.findOne({ where: { archive_file } }))
}

async function addArchiveData(archive_file, commit_count, filtered_commit_count) {
  return GitArchive.create({ archive_file, commit_count, filtered_commit_count })
}

module.exports = {  
  GitOwner,
  GitRepo,
  addRawCommit,
  archiveExists,
  addArchiveData,
  sequelize,
}