import "reflect-metadata";

import { DataSource } from "typeorm";

import { SwapEvent } from "./Models/SwapEvent";

const AppDataSource = new DataSource({
  type: "postgres",
  database: "content",
  entities: [SwapEvent],
  logging: false,
  synchronize: true,
  migrationsRun: true,
  url: process.env.AGGREGATOR_DB_URL,
});

const connection = AppDataSource.initialize();

export { connection };

export default AppDataSource;
