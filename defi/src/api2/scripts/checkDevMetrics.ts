
import { DataTypes, Model, QueryTypes, Sequelize } from 'sequelize';
import getEnv from '../env'
import { sendMessage } from '../../utils/discord';

async function run() {

  const ENV = getEnv()
  const metricsDbOptions = {
    host: ENV.metrics_host,
    port: ENV.metrics_port,
    username: ENV.metrics_user,
    password: ENV.metrics_password,
    database: ENV.metrics_db_name,
    dialect: 'postgres',
    logging: (msg: string) => {
      if (msg.includes('ERROR')) { // Log only error messages
        console.error(msg);
      }
    },
  }
  const sequelize = new Sequelize(metricsDbOptions as any);


  class GitArchive extends Model { }
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
      createdAt: 'createdat',
      updatedAt: 'updatedat',
    }
  )

  const lastArchive = await GitArchive.findOne({
    order: [['createdat', 'DESC']],
    raw: true,
  })

  // throw warning if 'updatedat' is older than 3 days
  const updatedat = new Date((lastArchive as any).updatedat)
  const now = new Date()
  const diff = now.getTime() - updatedat.getTime()
  const diffDays = diff / (1000 * 3600 * 24)
  if (diffDays > 3) {
    return sendMessage('[Github metrics] No new git commits were pulled after '+ (lastArchive as any).archive_file, process.env.TEAM_WEBHOOK!, true)
  }

  // add similar check for 'project_report' table, but fetch last 'updatedat' from there raw query
  const projectReport = await sequelize.query('SELECT updatedat FROM project_report ORDER BY updatedat DESC LIMIT 1', {
    type: QueryTypes.SELECT,
  })
  const projectReportUpdatedat = new Date((projectReport as any)[0].updatedat)
  const projectReportDiff = now.getTime() - projectReportUpdatedat.getTime()
  const projectReportDiffDays = projectReportDiff / (1000 * 3600 * 24)
  if (projectReportDiffDays > 3) {
    return sendMessage('[Github metrics] No new project report was generated after '+ projectReportUpdatedat, process.env.TEAM_WEBHOOK!, true)
  }
  console.log('Last updatedat for project_report', projectReportUpdatedat)
  console.log('Last updatedat for git_archive', updatedat)  
}

run().catch(console.error).then(() => {
  process.exit(0)
})