import { getLastRecord, hourlyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";

async function main(){
    getLastRecord(hourlyUsdTokensTvl(getProtocol("aave (treasury)").id)).then((b:any)=>console.log(b))
}
main()