import postgres from "postgres";
import setEnvSecrets from "./src/utils/shared/setEnvSecrets";

let coins2Connection: ReturnType<typeof postgres>

export async function getCoins2Connection() {
  if (!coins2Connection) (coins2Connection as any) = 'isBeingSet'
  if ((coins2Connection as any) === 'isBeingSet') {
    // @ts-ignore
    let auth: any = process.env.COINS2_AUTH
    if (!auth) await setEnvSecrets()
    // @ts-ignore
    auth = process.env.COINS2_AUTH?.split(",") ?? [];
    if (!auth || auth.length != 3) throw new Error("there arent 3 auth params. Cannot initialize coins2 connection.");
    coins2Connection = postgres(auth[0]);
  }
  return coins2Connection
}


export async function closeConnection() {
  if (coins2Connection && (coins2Connection as any) !== 'isBeingSet') {
    console.log('Closing Coins2 DB connection')
    await coins2Connection.end({ timeout: 2 })
    console.log('Coins2 DB connection closed')
  }
}

// @ts-ignore
process.on('exit', closeConnection)
// @ts-ignore
process.on('SIGINT', closeConnection)
// @ts-ignore
process.on('SIGTERM', closeConnection)
