const { ORGS_MISSING_FROM_TOML } = require('../../utils/index')
const { GitOwner, GitRepo, sequelize, } = require('../../db')

async function main() {
  await sequelize.sync()
  console.log('org length: ', ORGS_MISSING_FROM_TOML.length)
  return deleteGitOwnerWithRepos(ORGS_MISSING_FROM_TOML)
}

const deleteGitOwnerWithRepos = async (ownerNames) => {
  try {
    // Delete GitRepos associated with the given owner names
    await GitRepo.destroy({
      where: {
        owner: ownerNames,
      },
    });

    // Delete GitOwners based on the owner names
    await GitOwner.destroy({
      where: {
        name: ownerNames,
      },
    });

    console.log('Deletion successful');
  } catch (error) {
    console.error('Deletion failed:', error);
  }
}
// Call the function with the URL of the json.tz file
main()
  .catch(console.error)
  .then(() => sequelize.close())
  .then(() => process.exit(0))
