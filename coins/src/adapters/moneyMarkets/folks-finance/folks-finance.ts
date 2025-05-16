import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { formatUnits } from "ethers";
import { addToDBWritesList } from "../../utils/database";

const oracleManager: string = "0x7218Bd1050D41A9ECfc517abdd294FB8116aEe81";

const pools: { [id: string]: string } = {
  "1": "0x88f15e36308ED060d8543DA8E2a5dA0810Efded2", // fUSDC
  "2": "0x0259617bE41aDA4D97deD60dAf848Caa6db3F228", // fAVAX
  "3": "0x7033105d1a527d342bE618ab1F222BB310C8d70b", // fsAVAX
  "4": "0xB6DF8914C084242A19A4C7fb15368be244Da3c75", // fETH_eth
  "5": "0x51958ed7B96F57142CE63BB223bbd9ce23DA7125", // fETH_base
  "6": "0x795CcF6f7601edb41E4b3123c778C56F0F19389A", // fwETH_ava
  "7": "0x9936812835476504D6Cf495F4F0C718Ec19B3Aff", // fwBTC_eth
  "8": "0x1C51AA1516e1156d98075F2F64e259906051ABa9", // fBTCb_ava
  "9": "0x9eD81F0b5b0E9b6dE00F374fFc7f270902576EF7", // fcbBTC_base
  "10": "0x89970d3662614a5A4C9857Fcc9D9C3FA03824fe3", // fBNB
  "11": "0x18031B374a571F9e060de41De58Abb5957cD5258", // fETHB_bsc
  "12": "0xC2FD40D9Ec4Ae7e71068652209EB75258809e131", // fBTCB_bsc
  "13": "0x44E0d0809AF8Ee37BFb1A4e75D5EF5B96F6346A3", // fETH_arbitrum
  "14": "0x1177A3c2CccDb9c50D52Fc2D30a13b2c3C40BCF4", // fARB
  "15": "0x307bCEC89624660Ed06C97033EDb7eF49Ab0EB2D", // fSolvBTC
  "16": "0x5e5a2007a8D613C4C98F425097166095C875e6eE", // fJOE
  "17": "0xAdA5Be2A259096fd11D00c2b5c1181843eD008DC", // fggAVAX
  "19": "0x481cF0c02BF17a33753CE32f1931ED9990fFB40E", // fPOL
  "20": "0x7054254933279d93D97309745AfbFF9310cdb570", // fwBTC_pol
  "21": "0x88Ae56886233C706409c74c3D4EA9A9Ac1D65ab2", // fwETH_pol
};

export default async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const writes: Write[] = [];

  const [prices, interestIndexes, decimals, symbols] = await Promise.all([
    api.multiCall({
      calls: Object.keys(pools).map((poolId) => ({
        target: oracleManager,
        params: poolId,
      })),
      abi: "function processPriceFeed(uint8 poolId) view returns (uint256 price, uint8 decimals)",
    }),
    api.multiCall({
      calls: Object.values(pools).map((fTokenAddress) => ({
        target: fTokenAddress,
      })),
      abi: "function getUpdatedDepositInterestIndex() view returns (uint256 interestIndex)",
    }),
    api.multiCall({
      calls: Object.values(pools).map((fTokenAddress) => ({
        target: fTokenAddress,
      })),
      abi: "erc20:decimals",
    }),
    api.multiCall({
      calls: Object.values(pools).map((fTokenAddress) => ({
        target: fTokenAddress,
      })),
      abi: "erc20:symbol",
    }),
  ]);

  Object.values(pools).map((token, i) =>
    addToDBWritesList(
      writes,
      chain,
      token,
      parseFloat(
        formatUnits(BigInt(prices[i].price) * BigInt(interestIndexes[i]), 36),
      ),
      decimals[i],
      symbols[i],
      timestamp,
      "folks",
      0.9,
    ),
  );

  return writes;
}
