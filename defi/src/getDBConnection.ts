import postgres from "postgres";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

let accountsDBConnection: ReturnType<typeof postgres>
let errorReportsConnection: ReturnType<typeof postgres>
let coins2Connection: Promise<ReturnType<typeof postgres>>

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
  if (!coins2Connection) {
    coins2Connection = new Promise(async (resolve) => {
      // @ts-ignore
      let auth: any = process.env.COINS2_AUTH;
      if (!auth) await setEnvSecrets();
      // @ts-ignore
      auth = process.env.COINS2_AUTH?.split(",") ?? [];
      if (!auth || auth.length != 3)
        throw new Error(
          "there arent 3 auth params. Cannot initialize coins2 connection.",
        );
      resolve(postgres(auth[0], { idle_timeout: 90,
        // max_lifetime: 60 * 10
       }));
    });
  }
  return coins2Connection;
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
    await (await coins2Connection).end({ timeout: 2 })
    console.log('Coins2 DB connection closed')
  }
}

process.on('exit', closeConnection)
process.on('SIGINT', closeConnection)
process.on('SIGTERM', closeConnection)
