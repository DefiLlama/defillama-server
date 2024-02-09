import postgres from "postgres";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

let accountsDBConnection: ReturnType<typeof postgres>
let errorReportsConnection: ReturnType<typeof postgres>
let coins2Connection: ReturnType<typeof postgres>

export function getAccountsDBConnection() {
  if (!accountsDBConnection)
    accountsDBConnection = postgres(process.env.ACCOUNTS_DB!);

  return accountsDBConnection
}

export function getErrorDBConnection() {
  if (!errorReportsConnection)
    errorReportsConnection = postgres(process.env.ERROR_REPORTS_DB!);

  return errorReportsConnection
}

export async function getCoins2Connection() {
  if (!coins2Connection) (coins2Connection as any) = 'isBeingSet'
  if ((coins2Connection as any) === 'isBeingSet') {
    let auth: any = process.env.COINS2_AUTH
    if (!auth) await setEnvSecrets()
    auth = process.env.COINS2_AUTH?.split(",") ?? [];
    if (!auth || auth.length != 3) throw new Error("there arent 3 auth params. Cannot initialize coins2 connection.");
    coins2Connection = postgres(auth[0]);
  }
  return coins2Connection
}


export async function closeConnection() {
  if (accountsDBConnection) {
    console.log('Closing Accounts DB connection')
    await accountsDBConnection.end({ timeout: 2 })
    console.log('Accounts DB connection closed')
  }

  if (errorReportsConnection) {
    console.log('Closing Error Reports DB connection')
    await errorReportsConnection.end({ timeout: 2 })
    console.log('Error Reports DB connection closed')
  }

  if (coins2Connection && (coins2Connection as any) !== 'isBeingSet') {
    console.log('Closing Coins2 DB connection')
    await coins2Connection.end({ timeout: 2 })
    console.log('Coins2 DB connection closed')
  }
}

process.on('exit', closeConnection)
process.on('SIGINT', closeConnection)
process.on('SIGTERM', closeConnection)
