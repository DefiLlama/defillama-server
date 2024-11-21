const { GitOwner, GitRepo, sequelize, ProjectReport  } = require('../db')

async function main() {
  await sequelize.sync()
  const nullReports = await ProjectReport.findAll({ where: { report: null } })
  console.log('empty reports', nullReports.length)
  const orgs = nullReports.map(i => i.linked_orgs).flat()
  console.log('orgs', orgs)
  return deleteBadOwners(orgs)

}

async function deleteBadOwners(orgs) {
  for (const org of orgs) {
    const repos = await GitRepo.findAll({
      where: { owner: org }
    })
    if (!repos.length) {
      console.log('has no repos', org)
      continue;
    }
/*     const deleteResult = await GitRepo.destroy({
      where: {
        owner: [org],
      },
    })
  
    console.log(`Repo: ${deleteResult} records deleted.`)
    const deleteResult1 = await GitOwner.destroy({
      where: {
        name: [org],
      },
    })
  
    console.log(`Org: ${deleteResult1} records deleted.`)  */
  }

}


main()
  .catch(console.error)
  .then(() => sequelize.close())
  .then(() => process.exit(0))
