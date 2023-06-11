const { GitOwner, GitRepo, sequelize, addRawCommit, } = require('../../db')

async function main() {
  await sequelize.sync()
  const testOrg = await GitOwner.findOne({ where: { name: 'DefiLlama' } })
  console.log(testOrg)
  process.exit(0)

}


main()
