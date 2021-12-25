import { storeTvl } from "./getAndStoreTvl";
import iterateProtocols from "../storeTvlUtils/iterateProtocols";

export default async (protocolIndexes:number[]) => {
  await iterateProtocols(storeTvl, protocolIndexes);
};
