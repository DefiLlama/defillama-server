import "reflect-metadata";

import { DataSource } from "typeorm";

import { SwapEvent } from "./Models/SwapEvent";

const AppDataSource = new DataSource({
  type: "postgres",
  database: "content",
  entities: [SwapEvent],
  logging: false,
  migrationsRun: true,
  url: process.env.AGGREGATOR_DB_URL,
});

export default AppDataSource;
