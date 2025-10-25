import { getApi } from "../../utils/sdk";
import getWrites from "../../utils/getWrites";

const projectName = "Avant Protocol - savETH";
const chain  = "ethereum";
const savETH = "0xDA06eE2dACF9245Aa80072a4407deBDea0D7e341"; // ERC-4626
const avETH  = "0x9469470C9878bf3d6d0604831d9A3A366156f7EE";

export async function avantSavETH(timestamp: number) {
  const api = await getApi(chain, timestamp);

  const rate = await api.call({
    abi: "function convertToAssets(uint256 assets) external view returns (uint256)",
    target: savETH,
    params: 1e18.toString(),
  });

  const pricesObject: any = {
    [savETH]: {
      underlying: avETH,
      price: rate / 1e18,
    },
  };

  const writeData = {
    chain,
    timestamp,
    pricesObject,
    projectName,
  };

  console.log(writeData);

  return getWrites(writeData);
}
