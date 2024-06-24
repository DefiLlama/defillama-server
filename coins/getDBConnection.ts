import postgres from "postgres";

let coins2Connection: Promise<ReturnType<typeof postgres>>;

export async function getCoins2Connection() {
  if (!coins2Connection) {
    coins2Connection = new Promise(async (resolve) => {
      // @ts-ignore
      let auth: any = process.env.COINS2_AUTH;
      // @ts-ignore
      auth = process.env.COINS2_AUTH?.split(",") ?? [];
      if (!auth || auth.length != 3)
        throw new Error(
          "there arent 3 auth params. Cannot initialize coins2 connection.",
        );
      resolve(
        postgres(auth[0], {
          idle_timeout: 90,
          // max_lifetime: 60 * 10
        }),
      );
    });
  }
  return coins2Connection;
}

export async function closeConnection() {
  if (coins2Connection) {
    console.log("Closing Coins2 DB connection 2");
    await (await coins2Connection).end({ timeout: 2 });
    console.log("Coins2 DB connection closed");
  }
}

// @ts-ignore
process.on("exit", closeConnection);
// @ts-ignore
process.on("SIGINT", closeConnection);
// @ts-ignore
process.on("SIGTERM", closeConnection);
