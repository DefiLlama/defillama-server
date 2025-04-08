import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import getWrites from "../../utils/getWrites";
import getBlock from '../../utils/block';
import { ChainApi } from '@defillama/sdk';
import {formatUnits} from "ethers";

export const oracleManager: string = '0x7218Bd1050D41A9ECfc517abdd294FB8116aEe81';
export const loanManager: string = '0xF4c542518320F09943C35Db6773b2f9FeB2F847e';

export const getPools = async (api: ChainApi) => {
  const poolIdToFTokenAddress: Record<string, string> = {};
  let i = 1;
  while (true) {
    try {
      const pool = await api.call({
        abi: "function getPool(uint8 poolId) view returns (address)",
        target: loanManager,
        params: i,
      });
      if (!pool) {
        break;
      }
      poolIdToFTokenAddress[i++] = pool;
    } catch (e) {
      break;
    }
  }
  return poolIdToFTokenAddress;
}

export default async function getTokenPrice(chain: string, timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const api = await getApi(chain, timestamp);
  const pools = await getPools(api);
  const pricesObject: any = {};
  const writes: Write[] = [];
  let prices = await api.multiCall({
    calls: Object.keys(pools).map(poolId => ({ target: oracleManager, params: poolId })),
    abi: 'function processPriceFeed(uint8 poolId) view returns (uint256 price, uint8 decimals)',
    block: block,
  });
  let depositData = await api.multiCall({
    calls: Object.values(pools).map(fTokenAddress => ({ target: fTokenAddress })),
    abi: 'function getDepositData() view returns (uint16 optimalUtilisationRatio, uint256 totalAmount, uint256 interestRate, uint256 interestIndex)',
    block: block,
  });
  Object.values(pools).forEach((fTokenAddress, i) => {
    pricesObject[fTokenAddress] = {
      fTokenAddress,
      price: parseFloat(formatUnits(BigInt(prices[i].price) * BigInt(depositData[i].interestIndex), 36)),
    };
  });

  return getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "folks-finance",
  });
}
