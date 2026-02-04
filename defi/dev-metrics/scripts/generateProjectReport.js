const { sequelize, ProjectReport, } = require('../db')
const { ORG_MAPPING } = require('../utils')
const { saveGithubData, saveGithubOverview, } = require('../utils/r2')
const { Op } = require('sequelize');

async function main() {
  await sequelize.sync()
  await updateProjectReportMapping()
  await callUpdateCommitsSD()
  await generateReportsSD()
  await pushReportsToR2()
  await saveOverviewFile()
}

async function callUpdateCommitsSD() {
  console.log('Updating last commit timestamp using stored procedure')
  await sequelize.query('CALL project_report_update_commit_time()')
}
async function generateReportsSD() {
  console.log('Generate reports using stored procedure')
  await sequelize.query('CALL update_project_reports()')
}


async function updateProjectReportMapping() {
  console.log('Updating project report mapping')
  // fetch all but only certain fields
  const projectReports = await ProjectReport.findAll({
    attributes: { exclude: ['report', 'createdat', 'updatedat'] },
  })
  console.log('projectReports', projectReports.length)

  for (const [key, item] of Object.entries(ORG_MAPPING)) {
    if (!item.github?.length) continue;

    const project_id = item.type === 'chain' ? `chain#${key}` : item.id
    const name = item.type === 'chain' ? key : item.name
    let projectReport = projectReports.find(i => i.project_id === project_id)

    if (!projectReport) {
      let github = item.github
      if (typeof github === 'string') console.log('github is string', github, name, project_id, item.type)
      if (typeof github === 'string') github = [github]
      try {
        await ProjectReport.create({
          project_id,
          name,
          project_type: item.type,
          linked_orgs: github,
          last_report_generated_time: null,
          last_commit_update_time: null,
        })
      } catch (e) {
        console.error(e)
        console.log({ project_id, name, type: item.type, github })
      }
      continue;
    }

    if ((projectReport.name !== name)
      || !isSameArray(projectReport.linked_orgs, item.github)
    ) {
      console.log('Updating project report mapping', project_id, projectReport.name, name, item.github, projectReport.linked_orgs, isSameArray(projectReport.linked_orgs, item.github), projectReport.name !== name)
      await projectReport.update({
        name,
        project_type: item.type,
        linked_orgs: item.github,
        last_report_generated_time: null,
        last_commit_update_time: null,
      })
    }

  }
}

const blacklistedProjects = new Set(['5226'])

async function pushReportsToR2() {
  console.log('Pushing reports to R2')
  const projectReports = await ProjectReport.findAll({
    where: {
      exported_to_r2: false,
      report: { [Op.ne]: null },
    },
  })
  console.log('Reports not yet in R2', projectReports.length)
  for (const projectReport of projectReports) {
    if (!blacklistedProjects.has(projectReport.project_id + ''))
      await saveGithubData(projectReport.project_id, projectReport)
    await projectReport.update({ exported_to_r2: true })
  }
}

async function saveOverviewFile() {
  console.log('Saving overview file')
  const projectReports = await ProjectReport.findAll({
    where: {
      last_commit_update_time: { [Op.ne]: null },
    },
    attributes: ['project_id', 'last_commit_update_time', 'last_report_generated_time', 'project_type', 'name'],
  })
  return saveGithubOverview(projectReports)
}


// Call the function with the URL of the json.tz file
main()
  .catch(console.error)
  .then(() => sequelize.close())
  .then(() => process.exit(0))


function isSameArray(arr1, arr2) {
  if (arr1.length !== arr2.length) return false
  for (const item of arr1) {
    if (!arr2.includes(item)) return false
  }
  return true
}