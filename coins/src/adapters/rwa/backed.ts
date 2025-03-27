import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";
import abi from "./abi.json";

const oracles: any = [
  {
    key: "bCSPX",
    oracle: "0xf4e1b57fb228879d057ac5ae33973e8c53e4a0e0",
    chain: "ethereum",
    ethToken: "0x1e2c4fb7ede391d116e6b41cd0608260e8801d59",
  },
  {
    key: "bCOIN",
    oracle: "0x430d800d39c5a6af6f07d32a614bd8ab4d97b60f",
    chain: "arbitrum",
    ethToken: "0xbbcb0356bB9e6B3Faa5CbF9E5F36185d53403Ac9",
  },
  {
    key: "bNIU",
    oracle: "0x64ec00a5708e3816061a860feb3a405298a169dd",
    chain: "arbitrum",
    ethToken: "0x2f11eeee0bf21e7661a22dbbbb9068f4ad191b86",
  },
  {
    key: "bIB01",
    oracle: "0x32d1463eb53b73c095625719afa544d5426354cb",
    chain: "ethereum",
    ethToken: "0xCA30c93B02514f86d5C86a6e375E3A330B435Fb5",
  },
  {
    key: "bIBTA",
    oracle: "0xd27e6d02b72eb6fce04ad5690c419196b4ef2885",
    chain: "ethereum",
    ethToken: "0x52d134c6DB5889FaD3542A09eAf7Aa90C0fdf9E4",
  },
  {
    key: "bHIGH",
    oracle: "0xe7fd720d9920855cfb70a04feb4c2ee9b719ccd4",
    chain: "arbitrum",
    ethToken: "0x20C64dEE8FdA5269A78f2D5BDBa861CA1d83DF7a",
  },
  {
    key: "bC3M",
    oracle: "0x83bc9a0611497a3160ca4e37f7641bc4cd191a31",
    chain: "arbitrum",
    ethToken: "0x2F123cF3F37CE3328CC9B5b8415f9EC5109b45e7",
  },
  {
    key: "bERNA",
    oracle: "0x0bbc6c705db13e2bb99d58fa0f724d199fe4ea22",
    chain: "arbitrum",
    ethToken: "0x0f76D32CDccDcbd602A55Af23EAF58FD1eE17245",
  },
  {
    key: "bERNX",
    oracle: "0x676441c23211aad49245648533b7a633d9012390",
    chain: "arbitrum",
    ethToken: "0x3f95AA88dDbB7D9D484aa3D482bf0a80009c52c9",
  },
  {
    key: "bZPR1",
    oracle: "0xe3caf5d29f1728e1c59f18b60cc70426eb99dd68",
    chain: "arbitrum",
    ethToken: "0xAde6057FcAfa57d6d51FFa341C64ce4814995995",
  },
  {
    key: "bNVDA",
    oracle: "0xab16e8dc52b5fc2dbb0b28afdd119d696e580618",
    chain: "ethereum",
    ethToken: "0xA34C5e0AbE843E10461E2C9586Ea03E55Dbcc495",
  },
];

async function getTokenPrices(chain: string, timestamp: number) {
  const ethApi = await getApi("ethereum", timestamp);
  const arbiApi = await getApi("arbitrum", timestamp);
  const ethOracles = oracles.filter((o: any) => o.chain === "ethereum");
  const arbiOracles = oracles.filter((o: any) => o.chain === "arbitrum");
  const ethPrices = await ethApi.multiCall({
    abi: abi.latestAnswer,
    calls: ethOracles.map((o: any) => o.oracle),
  });
  const arbiPrices = await arbiApi.multiCall({
    abi: abi.latestAnswer,
    calls: arbiOracles.map((o: any) => o.oracle),
  });
  ethOracles.forEach(
    (oracle: any, i: any) => (oracle.price = ethPrices[i] / 1e8),
  );
  arbiOracles.forEach(
    (oracle: any, i: any) => (oracle.price = arbiPrices[i] / 1e8),
  );
  const pricesObject: any = {};
  const writes: Write[] = [];
  oracles.forEach((contract: any) => {
    pricesObject[contract.ethToken] = { price: contract.price };
  });

  writes.push(
    ...(await getWrites({
      chain,
      timestamp,
      writes,
      pricesObject,
      projectName: "backed",
    })),
  );

  writes.map((w: Write) => {
    writes.push({
      ...w,
      PK: `asset#avax:${w.PK.substring(w.PK.indexOf(":") + 1)}`,
    });
    writes.push({
      ...w,
      PK: `asset#base:${w.PK.substring(w.PK.indexOf(":") + 1)}`,
    });
    writes.push({
      ...w,
      PK: `asset#polygon:${w.PK.substring(w.PK.indexOf(":") + 1)}`,
    });
    writes.push({
      ...w,
      PK: `asset#xdai:${w.PK.substring(w.PK.indexOf(":") + 1)}`,
    });
  });
  return writes;
}

export function backed(timestamp: number = 0) {
  return getTokenPrices("ethereum", timestamp);
}
