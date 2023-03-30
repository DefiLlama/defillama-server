import { connection } from ".";
import { PermitBlackList } from "./Models/PermitBlackList";

export async function getPermitBlackList(chain: string): Promise<PermitBlackList[]> {
  const permitBlacklistRepository = (await connection).getRepository(PermitBlackList);
  const blacklistedTokens = await permitBlacklistRepository
    .createQueryBuilder()
    .select("permitBlackList")
    .from(PermitBlackList, "permitBlackList")
    .where("permitBlackList.chain = :chain", { chain })
    .getMany();

  return blacklistedTokens;
}
