import { allSpaceQuery, graphURL, } from './snapshotQueries'
import protocols from '../protocols/data'
import parentProtocols from '../protocols/parentProtocols'
import axios from 'axios'

function getGeckoSet() {
  const iProtocols: any = protocols.filter(i => !i.governanceID && i.gecko_id)
  iProtocols.push(...parentProtocols.filter(i => !i.governanceID && i.gecko_id))
  let geckoIds: any = iProtocols.map((i: any) => i.gecko_id)
  return new Set(geckoIds)
}

function getAddressSet() {
  const iProtocols: any = protocols.filter(i => !i.governanceID && i.address)
  // iProtocols.push(...parentProtocols.filter(i => !i.governanceID && i.address))
  let addresses: any = iProtocols.map((i: any) => i.address.split(':')[1]).filter((i: any) => i)
  return new Set(addresses)
}

async function main() {
  const geckoIds = getGeckoSet()
  const govAddresses = getAddressSet()
  console.log(govAddresses)
  console.log('Checking for coingecko ids:', ([...geckoIds]).length)
  console.log('Checking for gov addresses:', ([...govAddresses]).length)
  const table: any = []
  const spaces = await getAllSnapshots()
  console.log('Spaces with coingecko ids:', spaces.length)
  spaces
    .filter((i: any) => geckoIds.has(i.coingecko) || i.strategies?.some((j: any) => govAddresses.has(j?.params?.address?.toLowerCase())))
    .forEach((i: any) => table.push({ id: i.id, name: i.name, gecko: i.coingecko }))
  console.log('Snapshots found:')
  console.table(table)
}

export async function getAllSnapshots() {
  let skip = 0
  let fetchAgain = true
  const allSpaces: any = []
  do {
    const { data: { data: { spaces, } } } = await axios.post(graphURL, {
      query: allSpaceQuery,
      operationName: 'Spaces',
      variables: { skip },
    }, {
      headers: {
        'ContentType': 'application/json',
      }
    })
    if (spaces && spaces.length) {
      skip += 1000
      allSpaces.push(...spaces)
      console.log(allSpaces.length)
    } else fetchAgain = false
  } while (fetchAgain)

  return allSpaces
}

main().then(() => {
  console.log('done!')
  process.exit(0)
})