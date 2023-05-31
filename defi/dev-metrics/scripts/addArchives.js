const { addArchive } = require('../utils/archive')
const { sequelize } = require('../db')

const moment = require('moment');

// Define the start and end dates
let startDate = moment('2015-01-01-00', 'YYYY-MM-DD-HH');
// const startDate = moment('2020-01-26-23', 'YYYY-MM-DD-HH');
// const endDate = moment('2015-01-04-00', 'YYYY-MM-DD-HH');
const endDate = moment().startOf('hour').subtract(1, 'hour');

async function main() {
  await sequelize.sync()

  let fileNumber = { i: 1, startTimestamp: +Date.now(), totalHours: (endDate - startDate) / (3600 * 1e3), checked: 0 }
  // Iterate through each hour
  const currentHour = startDate.clone();
  while (currentHour.isSameOrBefore(endDate)) {
    // Format the current hour as "year-month-day-hour"
    // const formattedHour = currentHour.format('YYYY-MM-DD-HH');


    const formattedTime = currentHour.format('YYYY-MM-DD-HH');
    const archive_file = formattedTime.split('-').map((v, i) => i === 3 ? +v : v).join('-')

    // Process the current hour as needed
    try {
      fileNumber.checked++
      await addArchive(archive_file, fileNumber)
    } catch (e) {
      // console.error(e)
      console.log('Error processing', archive_file)
      // throw e
    }

    // Move to the next hour
    currentHour.add(1, 'hour');
  }

  sequelize.close()
}

// Call the function with the URL of the json.tz file
main().catch(console.error).then(() => process.exit(0))
