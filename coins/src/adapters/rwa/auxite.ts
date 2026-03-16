import { getApi } from "../utils/sdk";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

const AUXITE_TOKENS: { [symbol: string]: string } = {
  AUXG: "0x390164702040B509A3D752243F92C2Ac0318989D",
  AUXS: "0x82F6EB8Ba5C84c8Fd395b25a7A40ade08F0868aa",
  AUXPT: "0x119de594170b68561b1761ae1246C5154F94705d",
  AUXPD: "0xe051B2603617277Ab50C509F5A38C16056C1C908",
};

export async function auxite(timestamp: number = 0) {
  const api = await getApi("base", timestamp);
  const allPrices = await api.call({
    target: "0x585314943599C810698E3263aE9F9ec4C1C25Ff2",
    abi: "function getAllPrices() view returns (uint256 gold, uint256 silver, uint256 platinum, uint256 palladium, uint256 eth)",
  });

  const writes: Write[] = [];
  Object.keys(AUXITE_TOKENS).forEach((token, i) => {
    addToDBWritesList(
      writes,
      "ethereum",
      AUXITE_TOKENS[token],
      allPrices[i] / 1e6,
      3,
      token,
      timestamp,
      "auxite",
      1,
    );
  });

  return writes;
}
