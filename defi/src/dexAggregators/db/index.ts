import "reflect-metadata";

import { DataSource } from "typeorm";
import { PermitBlackList } from "./Models/PermitBlackList";
import { SwapEvent } from "./Models/SwapEvent";

let AppDataSource: DataSource;
let connection: Promise<DataSource>;

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

async function getConnection() {
  if (!connection) {
    connection = getAppDataSource().initialize();
  }
  return connection;
}


export { getConnection, getAppDataSource, };
