const { addArchive } = require('../utils/archive')
const { sequelize } = require('../db')

const archive_file = '2022-04-03-11'

async function main() {
  await sequelize.sync()

  await addArchive(archive_file)
  sequelize.close()
}

// Call the function with the URL of the json.tz file
main().then(() => process.exit(0)).catch(console.error)
