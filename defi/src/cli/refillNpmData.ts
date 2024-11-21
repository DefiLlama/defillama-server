import {storeNpmDayData} from "../storeNpmData"

// will start here and then go backwards in time
let date = new Date("2021-04-13")

// date format is 2014-02-01
const formatNpmDate = (d:Date)=>d.toISOString().slice(0, '2022-12-10'.length)

async function main(){
    while(true){
        await storeNpmDayData(formatNpmDate(date))
        console.log(`${formatNpmDate(date)} done`)
        date = new Date(date.getTime() - 24*3600*1e3)
    }
}
main()