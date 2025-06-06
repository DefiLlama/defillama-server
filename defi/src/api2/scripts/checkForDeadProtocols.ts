import '../utils/failOnError'

import { roundVaules, } from "../utils";
import * as sdk from "@defillama/sdk";
// import { sendMessage } from '../../utils/discord';
import axios from 'axios';
import { protocolsById } from "../../protocols/data";
import { importAdapter, } from "../../utils/imports/importAdapter";
import { sendMessage } from '../../utils/discord';

const lines = [] as string[]

// remember to run npm run prebuild before running this script
async function run() {
  // record time taken to run
  const start = Date.now()
  const { data: allProtocols } = await axios.get('https://api.llama.fi/protocols')
  const allProtocolsMap = {} as any
  const deadProtocolTable = [] as any
  const hackedOrRuggedProtocols = [] as any
  const lowTvlProtocols = [] as any
  const verHighBorrowedProtocols = [] as any
  const sixMonthAgoUnix = Math.floor((Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) / 1000)
  const yearAgoUnix = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000)
  const skipBorrowCategories = new Set(['RWA Lending', 'NFT Lending', 'Uncollateralized Lending'])

  for (const protocol of allProtocols) {
    const metadata = protocolsById[protocol.id]
    if (!metadata) {
      console.log('metadata not found for protocol', protocol.id, protocol.name)
      continue;
    }
    try {
      protocol.adapter = await importAdapter(metadata)
    } catch (e) {
      console.error('Error importing adapter for', metadata.id, metadata.name, e)
    }
    protocol.averageTvl = getAverageOfObject(protocol.chainTvls)
    protocol.hnTvl = hn(protocol.tvl)
    protocol.hnAvgTvl = hn(protocol.averageTvl)
    protocol.isMarkedDead = !!protocol.adapter?.deadFrom
    protocol.isHackedOrRugged = isHackedOrRugged(protocol)
    allProtocolsMap[protocol.id] = { ...metadata, ...protocol }

    if (protocol.isMarkedDead)
      deadProtocolTable.push(protocol)
    else if (protocol.tvl < 1000) {
      if (protocol.isHackedOrRugged && protocol.listedAt < sixMonthAgoUnix)
        hackedOrRuggedProtocols.push(protocol)
      else if (protocol.averageTvl < 420 && protocol.tvl < 420 && protocol.listedAt < yearAgoUnix)
        lowTvlProtocols.push(protocol)

    }

    // for catching high borrowed protocols
    if (protocol.chainTvls?.borrowed && !skipBorrowCategories.has(protocol.category)) {
      const borrowed = protocol.chainTvls.borrowed
      const tvl = protocol.tvl
      const diff = getDiffPercentage(borrowed, tvl)
      if (diff > 300) {
        protocol.borrowedDiff = diff/100
        protocol.borrowedDiffHn = (diff/100) + 'x'
        protocol.borrowedOrig = borrowed
        protocol.borrowed = hn(borrowed)
        verHighBorrowedProtocols.push(protocol)
      }
    }

  }

  // console.table(deadProtocolTable, ['id', 'name', 'hnTvl', 'deadFrom',])


  console.log('These are hacked or rugged protocols with tvl < 1000 over 6 months old')
  console.table(hackedOrRuggedProtocols, ['id', 'name', 'hnTvl', 'hnAvgTvl'])

  console.log('These are low tvl protocols with tvl < 420 over a year old')
  console.table(lowTvlProtocols, ['id', 'name', 'hnTvl', 'hnAvgTvl', 'chain', 'url', 'twitter'])

  console.log('# dead protocols:', deadProtocolTable.length)

  verHighBorrowedProtocols.sort((a: any, b: any) => b.borrowedDiff - a.borrowedDiff)
  console.log('These are protocols with high borrowed tvl')
  console.table(verHighBorrowedProtocols, ['id', 'name', 'borrowedDiffHn', 'borrowed', 'hnTvl', 'category', 'chain', 'isMarkedDead'])

  const whitelistedSet = new Set([
    'test market',
    'Rho Markets',
    'Orbit Protocol',
    'MovePosition',
    'DAOLama',
    'RealT RMM Marketplace V2',
  ])
  const filteredHighBorrowedProtocols = verHighBorrowedProtocols.filter((i: any) => {
    return i.borrowedOrig  > 200_000 && !i.isMarkedDead && i.borrowedDiff > 5 && i.category === 'Lending' && !whitelistedSet.has(i.name)
  })

  if (filteredHighBorrowedProtocols.length > 0) {
    console.log('These are protocols with high borrowed tvl [filtered list]')
    console.table(filteredHighBorrowedProtocols, ['id', 'name', 'borrowedDiffHn', 'borrowed', 'hnTvl', 'category', 'chain', 'isMarkedDead'])

    if (process.env.TEAM_WEBHOOK) {
      let message = tableToString(filteredHighBorrowedProtocols, ['id', 'name', 'borrowedDiffHn', 'borrowed', 'hnTvl', 'chain',])
      message = `These are protocols with high borrowed tvl 
      ${message}
    (if the protocol has correct data, add it to the whitelist here: https://github.com/DefiLlama/defillama-server/blob/master/defi/src/api2/scripts/checkForDeadProtocols.ts#L87)
      `
      await sendMessage(message, process.env.TEAM_WEBHOOK!)

    }
  }
  
  const timeTaken = Number((Date.now() - start) / 1e3).toFixed(2)
  const timeTakensString = `\nRan check in ${timeTaken}s`

  lines.push(timeTakensString)
  console.log(lines.join('\n'))
  // await sendMessage(lines.join('\n'), process.env.VOLUMES_WEBHOOK)

}

const hn = (n: number) => n ? sdk.humanizeNumber(Math.round(n)) : '0'

run().catch(console.error).then(() => process.exit(0))

function getDiffPercentage(current: number, other: number) {
  return roundVaules(current * 100 / other - 100)
}

function getAverageOfObject(obj: Record<string, number> = {}) {
  return Object.values(obj).reduce((a: number, b: number) => a + b, 0) / Object.keys(obj).length
}

function isHackedOrRugged(protocol: any) {
  const str = JSON.stringify(protocol.hallmarks ?? []).toLowerCase()
  return str.includes('hack') || str.includes('rug')
}

function tableToString(data: any, columns: any) {
  let tableString = '';

  // Add the header row
  // tableString += columns.join(' | ') + '\n';
  // tableString += columns.map(() => '---').join(' | ') + '\n';
  const headerObject: any = {}
  const headerObject1: any = {}
  columns.forEach((col: any) => {
    headerObject[col] = col
    headerObject1[col] = '---'
  })
  data.unshift(headerObject1)
  data.unshift(headerObject)
  // Calculate the maximum width for each column
  const columnWidths = columns.map((col: any) => 
    Math.max(col.length, ...data.map((row: any) => (row[col] !== undefined ? String(row[col]).length : 0)))
  );

  // Add the data rows
  data.forEach((row: any) => {

    // Format the row with padded values
    const tableRow = columns.map((col: any, index: number) => {
      const cell = row[col] !== undefined ? String(row[col]) : '';
      return cell.padEnd(columnWidths[index], ' ');
    }).join(' | ');
    tableString += tableRow + '\n';
  });

  return tableString;
}