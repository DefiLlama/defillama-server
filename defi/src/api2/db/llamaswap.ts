import "reflect-metadata";

import { DataSource } from "typeorm";
import { SwapEvent } from "../../dexAggregators/db/Models/SwapEvent";
import { PermitBlackList } from "../../dexAggregators/db/Models/PermitBlackList";

let AppDataSource: DataSource;
let connection: DataSource;

function getAppDataSource() {
  if (!AppDataSource)
    AppDataSource = new DataSource({
      type: "postgres",
      database: "content",
      entities: [SwapEvent, PermitBlackList],
      logging: false,
      synchronize: true,
      migrationsRun: true,
      url: process.env.AGGREGATOR_DB_URL,
    });
  return AppDataSource;
}

async function initLlamaswapDB() {
  try {
    connection = await getAppDataSource().initialize();
    return connection;
  } catch (e) {
    console.error(e);
  }
}

export { initLlamaswapDB, getAppDataSource, connection };
