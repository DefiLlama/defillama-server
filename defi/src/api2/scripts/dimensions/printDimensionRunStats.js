const fs = require('fs');
const allLogs = fs.readFileSync(__dirname + '/../../../../dimensionsRun.log', 'utf8').split('\n')
const outputFile = __dirname + '/../../../../dimensionsRunStats.log'
fs.writeFileSync(outputFile, '') // reset file before appending to it

printBlockLogStats()
printIndexerLogs()
printRPCLogs()
printAdapterStats()

function printIndexerLogs() {
  log('[Indexer getLogs stats] ')
  const startedLogs = allLogs.filter(i => i.startsWith('[Indexer] Pulling logs'))
  const endLogs = allLogs.filter(i => i.startsWith('Indexer-getLo')).map(parseIndexerGetLogsLine).filter(i => i)
  const iErrorNotCaughtUp = allLogs.filter(i => i.startsWith('Error in  indexer getLogs Indexer not up to date'))
  const parsedIErrorNotCaughtUp = iErrorNotCaughtUp.map(parseIndexerOldLogs).filter(i => i)
  const parsedIErrorNotCaughtUp2 = iErrorNotCaughtUp.map(parseIndexerOldLogs).filter(i => !['bsc', 'polygon'].includes(i.chain))

  parsedIErrorNotCaughtUp2.sort((a, b) => b.diff - a.diff)
  log(`query count: ${startedLogs.length}`)
  log(`success query count: ${endLogs.length}`)
  log(`skipped because not yet indexed: ${parsedIErrorNotCaughtUp.length}`)
  log(`skipped because not yet indexed [excluding polygon & bsc]: ${parsedIErrorNotCaughtUp2.length}`)

  table(parsedIErrorNotCaughtUp2, undefined, 'Skipped Queries');

  const eventHashStats = {}
  const chainStats = {}

  endLogs.forEach(({ chain, eventHash, addressCount, timeTaken }) => {
    if (!eventHashStats[eventHash])
      eventHashStats[eventHash] = { hash: eventHash, chains: new Set(), addressCount: 0, queryCount: 0, chainStats: {}, timeTaken: 0, }

    if (!chainStats[chain])
      chainStats[chain] = { chain, queryCount: 0, addressCount: 0, timeTaken: 0 }

    const eStats = eventHashStats[eventHash]
    const cStats = chainStats[chain]

    if (!eStats.chainStats[chain])
      eStats.chainStats[chain] = { chain, queryCount: 0, addressCount: 0, timeTaken: 0 }
    const ecStats = eStats.chainStats[chain]

    eStats.timeTaken += +timeTaken
    eStats.addressCount += addressCount
    eStats.queryCount += 1
    ecStats.timeTaken += +timeTaken
    ecStats.addressCount += addressCount
    ecStats.queryCount += 1
    eStats.chains.add(chain)
    cStats.timeTaken += +timeTaken
    cStats.addressCount += addressCount
    cStats.queryCount += 1
  })

  const eStatsArray = Object.values(eventHashStats)
  const cStatsArray = Object.values(chainStats)

  eStatsArray.forEach(i => i.timeTaken = Math.floor(i.timeTaken))
  cStatsArray.forEach(i => i.timeTaken = Math.floor(i.timeTaken))
  eStatsArray.sort((a, b) => b.queryCount - a.queryCount)
  cStatsArray.sort((a, b) => b.queryCount - a.queryCount)

  table(eStatsArray.filter(filterOutSmallStats), ['hash', 'chains', 'queryCount', 'addressCount', 'timeTaken'], 'Breakdown by event hash')
  table(cStatsArray.filter(filterOutSmallStats), ['chain', 'queryCount', 'addressCount', 'timeTaken'], 'Breakdown by chain')


  eStatsArray.filter(i => i.queryCount > 70 & i.timeTaken > 300).forEach(eStats => {
    const title = `Chain breakdown for event hash ${eStats.hash}`
    const chainStats = Object.values(eStats.chainStats)
    chainStats.sort((a, b) => b.queryCount - a.queryCount)
    chainStats.forEach(i => i.timeTaken = Math.floor(i.timeTaken))
    table(chainStats.filter(filterOutSmallStats), ['chain', 'queryCount', 'addressCount', 'timeTaken'], title)
  })

  function parseIndexerOldLogs(logs) {
    const regex = /Error in  indexer getLogs Indexer not up to date for (\w+). Last indexed block: (\d+), requested block: (\d+)/;
    const match = logs.match(regex);
    if (match) {
      const [, chain, lastIndexedBlock, requestedBlock] = match;
      return { chain, lastIndexedBlock: parseInt(lastIndexedBlock), requestedBlock: parseInt(requestedBlock), diff: requestedBlock - lastIndexedBlock };
    }
    return null;
  }


  function parseIndexerGetLogsLine(line) {
    const regex = /Indexer-getLogs-(\w+)-(\w+)-([^-]+)_(\w+)/;
    const match = line.match(regex);
    if (match) {
      let [, chain, eventHash, addresses, _randomStr,] = match;
      const timeTaken = getTimeTaken(line.split(': ')[1])
      addresses = addresses.split(',');

      return { chain, eventHash, addresses, addressCount: addresses.length, multiAddress: addresses.length > 1, timeTaken };
    }
    return null
  }

}

function printRPCLogs() {
  log('[RPC getLogs stats] ')
  const startedLogs = allLogs.filter(i => i.startsWith('adding logs to cache:  '))
  const endLogs = allLogs.filter(i => i.startsWith('getLogs')).map(parseGetLogsLine).filter(i => i)
  log(`query count: ${startedLogs.length}`)
  log(`success query count: ${endLogs.length}`)

  const eventHashStats = {}
  const chainStats = {}

  endLogs.forEach(({ chain, eventHash, timeTaken }) => {
    if (!eventHashStats[eventHash])
      eventHashStats[eventHash] = { hash: eventHash, chains: new Set(), queryCount: 0, chainStats: {}, timeTaken: 0, }

    if (!chainStats[chain])
      chainStats[chain] = { chain, queryCount: 0, timeTaken: 0 }

    const eStats = eventHashStats[eventHash]
    const cStats = chainStats[chain]

    if (!eStats.chainStats[chain])
      eStats.chainStats[chain] = { chain, queryCount: 0, timeTaken: 0 }
    const ecStats = eStats.chainStats[chain]

    eStats.timeTaken += +timeTaken
    eStats.queryCount += 1
    ecStats.timeTaken += +timeTaken
    ecStats.queryCount += 1
    eStats.chains.add(chain)
    cStats.timeTaken += +timeTaken
    cStats.queryCount += 1
  })

  const eStatsArray = Object.values(eventHashStats)
  const cStatsArray = Object.values(chainStats)

  eStatsArray.forEach(i => i.timeTaken = Math.floor(i.timeTaken))
  cStatsArray.forEach(i => i.timeTaken = Math.floor(i.timeTaken))
  eStatsArray.sort((a, b) => b.queryCount - a.queryCount)
  cStatsArray.sort((a, b) => b.queryCount - a.queryCount)

  table(eStatsArray.filter(filterOutSmallStats), ['hash', 'chains', 'queryCount', 'timeTaken'], 'Breakdown by event hash')
  table(cStatsArray.filter(filterOutSmallStats), ['chain', 'queryCount', 'timeTaken'], 'Breakdown by chain')


  eStatsArray.filter(i => i.queryCount > 70 & i.timeTaken > 300).forEach(eStats => {
    const title = `Chain breakdown for event hash ${eStats.hash}`
    const chainStats = Object.values(eStats.chainStats)
    chainStats.sort((a, b) => b.queryCount - a.queryCount)
    chainStats.forEach(i => i.timeTaken = Math.floor(i.timeTaken))
    table(chainStats.filter(filterOutSmallStats), ['chain', 'queryCount', 'timeTaken'], title)
  })

  function parseGetLogsLine(line) {
    const regex = /getLogs-(\w+)-(\w+)-([^-]+)_(\w+)/;
    const match = line.match(regex);
    if (match) {
      let [, chain, eventHash, address, _randomStr,] = match;
      const timeTaken = getTimeTaken(line.split(': ')[1])

      return { chain, eventHash, address, timeTaken };
    }
    return null
  }

}

function printBlockLogStats() {
  log('[Block call stats] ')
  const logs = allLogs.filter(i => i.startsWith('chain: ') && i.includes('#calls')).map(parseBlockStatsString).filter(i => i)

  log(`block query count: ${logs.length}`)

  const chainStats = {}

  logs.forEach(({ chain, calls, imprecision, timeTaken, }) => {

    if (!chainStats[chain])
      chainStats[chain] = { chain, queryCount: 0, callCount: 0, timeTaken: 0, imprecision: 0, }

    const cStats = chainStats[chain]

    cStats.timeTaken += +timeTaken
    cStats.calls += +calls
    cStats.imprecision += imprecision
    cStats.queryCount += 1
  })

  const cStatsArray = Object.values(chainStats)

  cStatsArray.forEach(i => {
    i.avgTimeTakenInSec = Number(i.timeTaken / i.queryCount).toFixed(2)
    i.avgImpresicionInMins = Number(i.imprecision / i.queryCount).toFixed(2)
    i.timeTaken = Math.floor(i.timeTaken)
  })
  cStatsArray.sort((a, b) => b.queryCount - a.queryCount)

  table(cStatsArray, ['chain', 'queryCount', 'callCount', 'timeTaken', 'avgTimeTakenInSec', 'avgImpresicionInMins'], 'Breakdown by chain')

  function parseBlockStatsString(statsString) {
    const regex = /chain: (\w+) block: (\d+) #calls: (\d+) imprecision: ([\d.]+) \(min\) Time Taken: ([\d.]+) \(in sec\)/;
    const match = statsString.match(regex);
    if (match) {
      const [, chain, block, calls, imprecision, timeTaken] = match;
      return {
        chain,
        block: parseInt(block),
        calls: parseInt(calls),
        imprecision: parseFloat(imprecision),
        timeTaken: parseFloat(timeTaken)
      };
    }
    return null;
  }
}

function printAdapterStats() {
  log('[Adapter type stats] ')
  const startLogs = allLogs.filter(i => i.startsWith('[')).map(parseStartLog).filter(i => i)
  const endLogs = allLogs.filter(i => i.startsWith('[')).map(parseEndLog).filter(i => i)

  const stats = {}

  startLogs.forEach(({ adapterType, name, }) => {
    if (!stats[adapterType])
      stats[adapterType] = { adapterType, startCount: 0, endCount: 0, notFinished: new Set(), }
    const i = stats[adapterType]
    i.startCount += 1
    i.notFinished.add(name)
  })

  endLogs.forEach(({ adapterType, name, }) => {
    if (!stats[adapterType])
      stats[adapterType] = { adapterType, startCount: 0, endCount: 0, notFinished: new Set(), }
    const i = stats[adapterType]
    i.endCount += 1
    i.notFinished.delete(name)
  })

  const statsArray = Object.values(stats)
  statsArray.sort((a, b) => b.startCount - a.startCount)
  statsArray.forEach(i => {
    i.notFinished = Array.from(i.notFinished)
    i.notFinishedCount = i.notFinished.length
  })



  table(statsArray, ['adapterType', 'startCount', 'notFinishedCount', 'notFinished'], 'Breakdown by adapter type')

  function parseEndLog(statsString) {
    const regex = /\[(.+)\] - (.+) done!$/;
    const match = statsString.match(regex);
    if (match) {
      const [, adapterType, name] = match;
      return { adapterType, name, };
    }
    return null;
  }
  function parseStartLog(statsString) {
    if (statsString.includes('expensive adapter')) return null
    const regex = /\[(.+)\] - \d+\/\d+ - (.*)/;
    const match = statsString.match(regex);
    if (match) {
      const [, adapterType, name] = match;
      return { adapterType, name, };
    }
    return null;
  }
}

function log(message) {
  console.log(message);
  fs.appendFileSync(outputFile, message + '\n', 'utf8');
}

function table(data, columns, title = '') {
  if (title)
    log('\n' + title)

  console.table(data, columns);
  if (!columns) columns = Object.keys(data[0] ?? {})

  const tableString = tableToString(data, columns);
  fs.appendFileSync(outputFile, tableString + '\n', 'utf8');



  function tableToString(data, columns) {
    let tableString = '';

    // Add the header row
    // tableString += columns.join(' | ') + '\n';
    // tableString += columns.map(() => '---').join(' | ') + '\n';
    const headerObject = {}
    const headerObject1 = {}
    columns.forEach((col) => {
      headerObject[col] = col
      headerObject1[col] = '---'
    })
    data.unshift(headerObject1)
    data.unshift(headerObject)
    // Calculate the maximum width for each column
    const columnWidths = columns.map((col) =>
      Math.max(col.length, ...data.map((row) => (row[col] !== undefined ? String(row[col]).length : 0)))
    );

    // Add the data rows
    data.forEach((row) => {
      // Format the row with padded values
      const tableRow = columns.map((col, index) => {
        const cell = row[col] !== undefined ? String(row[col]) : '';
        return cell.padEnd(columnWidths[index], ' ');
      }).join(' | ');
      tableString += tableRow + '\n';
    });

    return tableString;
  }
}

function getTimeTaken(time) {
  time = time.trim()
  if (time.includes(':')) {
    const [minutes, seconds] = time.split(':');
    const milliseconds = seconds.split('.')[1];
    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds.split('.')[0]);
    return parseFloat(totalSeconds + '.' + milliseconds).toFixed(2);
  } else if (time.includes('ms')) {
    return parseFloat(time.replace('ms', '') / 1000).toFixed(2);
  } else if (time.includes('s')) {
    return parseFloat(time.replace('s', '')).toFixed(2);
  }
  return null;
}

function filterOutSmallStats(i) {
  return i.timeTaken > 200 || i.queryCount > 25
}