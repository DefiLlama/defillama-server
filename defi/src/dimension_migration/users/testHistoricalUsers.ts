require("dotenv").config();
import {addressList} from "./list";
import { convertChainToFlipside, isAcceptedChain } from "./utils/convertChain";
import { queryFlipside } from "../helpers/flipsidecrypto";
import { ChainAddresses } from "./utils/types";
import { isAddressesUsable } from "./utils/countUsers";

function encode(n:number[]){
  const digit="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  const toB64=(x:number)=>x.toString(2).split(/(?=(?:.{6})+(?!.))/g).map(v=>digit[parseInt(v,2)]).join("")
  //const fromB64=(x:string)=>x.split("").reduce((s,v)=>s*64+digit.indexOf(v),0)

  const str = n.map(nn=>toB64(nn).padStart(4, "=")).join("")
  return str
}

async function main() {
    const selectedProtocol = process.argv[2]
    const protocol = addressList.find(addresses => {
        return addresses.name.toLowerCase() === selectedProtocol.toLowerCase()
    }) as any
    if (protocol === undefined) {
        console.log("No protocol with that name!")
        return
    }
    let addresses:ChainAddresses
    if(protocol.getAddresses){
      addresses = await protocol.getAddresses()
    } else {
      addresses = protocol.addresses
    }
    if(!isAddressesUsable({addresses, id:protocol.id, name:protocol.name})){
      throw new Error("Protocol has no addresses on indexed chains")
    }
    const chainArray = Object.entries(addresses).filter(([chain]) => isAcceptedChain(chain))
    const usersChart = await queryFlipside(`
WITH
  ${chainArray.map(([chain, chainAddresses]: [string, string[]]) =>
        `${chain} AS (
        SELECT
            date_trunc(day, block_timestamp) as dt,
            from_address
        FROM
            ${convertChainToFlipside(chain)}.core.fact_transactions
        WHERE
            ${chainAddresses.length > 1 ?
            `TO_ADDRESS in (${chainAddresses.map(a => `'${a.toLowerCase()}'`).join(',')})` :
            `TO_ADDRESS = '${chainAddresses[0].toLowerCase()}'`}
        )`).join(',\n')}

SELECT
  dt,
  COUNT(DISTINCT from_address) AS active_users
FROM
  (
    ${chainArray.map(([chain]) => `SELECT
      dt,
      from_address
    FROM
    ${chain}`).join("\nUNION\n")}
  )
GROUP BY
  dt
ORDER BY
  dt ASC;`)
    const sequentialData = [] as number[]
    let lastTimestamp:number|null = null
    const parseDate = (dateString:string) =>{
      const date = new Date(`${dateString} UTC`)
      return Math.round(date.getTime() / 1e3)
    }
    usersChart.forEach(([dateString, users]:[string,number]) => {
        const start = parseDate(dateString)
        if(lastTimestamp !== null){
          const DAY = 24*3600
          while(lastTimestamp + 1.5*DAY < start){
            sequentialData.push(0)
            lastTimestamp += DAY
          }
        }
        sequentialData.push(users)
        lastTimestamp = start
    })
    console.log(`Check the chart at https://defillama.com/adapterTest?start=${parseDate(usersChart[0][0])}&data=${encode(sequentialData)}`)
}
main()


