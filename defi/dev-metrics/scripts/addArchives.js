const { addArchive } = require('../utils/archive')
const { sequelize } = require('../db')

const moment = require('moment');

// Define the start and end dates
// let startDate = moment('2015-01-01-00', 'YYYY-MM-DD-HH');
const startDate = moment('2024-02-26-2', 'YYYY-MM-DD-HH');
// const endDate = moment('2015-01-04-00', 'YYYY-MM-DD-HH');
const endDate = moment().startOf('hour').subtract(4, 'hour');

async function main() {
  // await sequelize.sync()

  let fileNumber = { i: 1, startTimestamp: +Date.now(), totalHours: (endDate - startDate) / (3600 * 1e3), checked: 0 }
  const checkedTill = moment('2020-08-27-8', 'YYYY-MM-DD-HH');
  while (startDate.isSameOrBefore(checkedTill)) {
    fileNumber.checked++
    // Move to the next hour
    startDate.add(1, 'hour');
  }
  // Iterate through each hour
  while (startDate.isSameOrBefore(endDate)) {
    // Format the current hour as "year-month-day-hour"
    // const formattedHour = startDate.format('YYYY-MM-DD-HH');


    const formattedTime = startDate.format('YYYY-MM-DD-HH');
    const archive_file = formattedTime.split('-').map((v, i) => i === 3 ? +v : v).join('-')

    // Process the current hour as needed
    try {
      fileNumber.checked++
      await addArchive(archive_file, fileNumber)
    } catch (e) {
      console.error(e)
      console.log('Error processing', archive_file)
      // throw e
    }

    // Move to the next hour
    startDate.add(1, 'hour');
  }

  sequelize.close()
}

// Call the function with the URL of the json.tz file
main().catch(console.error).then(() => process.exit(0))
