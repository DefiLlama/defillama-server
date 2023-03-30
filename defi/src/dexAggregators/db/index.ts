import "reflect-metadata";

import { DataSource } from "typeorm";
import { PermitBlackList } from "./Models/PermitBlackList";
import { SwapEvent } from "./Models/SwapEvent";

const AppDataSource = new DataSource({
  type: "postgres",
  database: "content",
  entities: [SwapEvent, PermitBlackList],
  logging: false,
  synchronize: true,
  migrationsRun: true,
  url: process.env.AGGREGATOR_DB_URL,
});

const connection = AppDataSource.initialize();

export { connection };

export default AppDataSource;
