import { getConnection } from ".";
import { PermitBlackList } from "./Models/PermitBlackList";

export const saveBlacklistPemrit = async ({ address, chain }: PermitBlackList) => {
  const blacklistedToken = new PermitBlackList();
  blacklistedToken.address = address;
  blacklistedToken.chain = chain;

  const res = await (await getConnection()).manager.save(blacklistedToken);
  return res;
};
