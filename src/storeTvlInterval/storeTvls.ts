import { storeTvl } from "./getAndStoreTvl";
import iterateProtocols from "../storeTvlUtils/iterateProtocols";

export default async (intervalStart: number, intervalEnd: number) => {
  await iterateProtocols(storeTvl, intervalStart, intervalEnd);
};
