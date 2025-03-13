import { sequelize, ProjectReport, } from '../../../dev-metrics/db'
import { Op } from 'sequelize'
import fs from 'fs'
import path from 'path'
import { readRouteData, storeRouteData } from '../cache/file-cache'

const allDataFile = '/github-metrics/allData'
const cacheDir = path.join(__dirname, '.cache')
const lastRunFile = path.join(cacheDir, '.cron-task-github-last-run')

export async function pullDevMetricsData() {
  try {
    if (!shouldRunTask()) {
      console.log('Dev metrics: Task was already run within the last day.')
      return getDevMetricsData()
    }

    fs.writeFileSync(lastRunFile, new Date().toISOString())



    await sequelize.sync()

    const projectReports = await ProjectReport.findAll({
      where: {
        report: { [Op.ne]: null },
      },
      raw: true,
    })

    await storeRouteData(allDataFile, projectReports)
    return projectReports
  } catch (error) {
    console.error('Dev metrics: Error pulling data', error)
    return []
  }
}


export function getDevMetricsData() {
  return readRouteData(allDataFile)
}


//run task only once a day
function shouldRunTask(): boolean {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir)
  }

  if (!fs.existsSync(lastRunFile)) {
    return true
  }
  const lastRun = fs.readFileSync(lastRunFile, 'utf-8')
  const lastRunDate = new Date(lastRun)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - lastRunDate.getTime())
  return diffTime > (1000 * 60 * 60 * 24)
}