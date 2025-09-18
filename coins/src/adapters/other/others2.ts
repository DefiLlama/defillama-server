
import getWrites from "../utils/getWrites";
import { getTokenSupplies, getTokenAccountBalances, } from "../solana/utils";
import { getApi } from "../utils/sdk";
import { nullAddress } from "../../utils/shared/constants";
import { getLogs } from "../../utils/cache/getLogs";
import { getObject, } from "../utils/sui";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { CoinData, Write } from "../utils/dbInterfaces";
import axios from "axios";


async function solanaAVS(timestamp: number = 0) {
  const chain = "solana";
  const tokens = [
    { mint: 'sonickAJFiVLcYXx25X9vpF293udaWqDMUCiGtk7dg2', underlying: 'sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh', tokenAccount: 'Bc7hj6aFhBRihZ8dYp8qXWbuDBXYMya4dzFGmHezLnB7', symbol: 'sonicsSOL', decimals: 9, },
  ]
  const supplies = await getTokenSupplies(tokens.map(i => i.mint))
  const balances = await getTokenAccountBalances(tokens.map(i => i.tokenAccount), { individual: true, })
  const pricesObject: any = {}
  tokens.forEach((token, i) => {
    const price = balances[i].amount / supplies[i].amount
    pricesObject[token.mint] = {
      underlying: token.underlying,
      price,
      symbol: token.symbol,
      decimals: token.decimals,
    }
  })
  return getWrites({ chain, timestamp, pricesObject, projectName: "solanaAVS", });
}


async function wstBFC(timestamp: number = 0) {
  const chain = "bfc";
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};
  const wstBFC = "0x386f2F5d9A97659C86f3cA9B8B11fc3F76eFDdaE";
  const bal = await api.call({ abi: "erc20:balanceOf", target: '0xEff8378C6419b50C9D87f749f6852d96D4Cc5aE4', params: wstBFC, });
  const supply = await api.call({ abi: "erc20:totalSupply", target: wstBFC });
  pricesObject[wstBFC] = { price: bal / supply, underlying: nullAddress };
  return getWrites({ chain, timestamp, pricesObject, projectName: "other2", });
}

async function stOAS(timestamp: number = 0) {
  const chain = "oas";
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};
  const stOAS = "0x804c0ab078e4810edbec24a4ffb35ceb3e5bd61b";
  const rate = await api.call({ abi: "uint256:exchangeRate", target: stOAS });
  pricesObject[stOAS] = { price: rate / 1e18, underlying: nullAddress };
  return getWrites({ chain, timestamp, pricesObject, projectName: "other2", });
}

async function wSTBT(timestamp: number = 0) {
  const chain = "ethereum";
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};
  const wSTBT = "0x288a8005c53632d920045b7c7c2e54a3f1bc4c83";
  const price = await api.call({ abi: "uint256:stbtPerToken", target: wSTBT });
  pricesObject[wSTBT] = { price: price / 1e18, underlying: '0x530824DA86689C9C17CdC2871Ff29B058345b44a' };
  return getWrites({ chain, timestamp, pricesObject, projectName: "other2", });
}

async function feUBTC(timestamp: number = 0) {
  const chain = "hyperliquid";
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};
  const feUBTC = "0xefbd9cfe88235f0e648aefb52c8e8dc152a9ad6f";
  const UBTC = "0x9fdbda0a5e284c32744d2f17ee5c74b284993463";
  const supply = (await api.call({ abi: "uint256:totalSupply", target: feUBTC })) / 1e18;
  const balance = (await api.call({ abi: "erc20:balanceOf", params: feUBTC, target: UBTC })) / 1e8
  pricesObject[feUBTC] = { price: balance / supply, underlying: UBTC };

  // wHLP
  const wHLP = "0x1359b05241cA5076c9F59605214f4F84114c0dE8";
  const wHLPRate = (await api.call({ abi: "uint256:getRate", target: '0x470bd109a24f608590d85fc1f5a4b6e625e8bdff' })) / 1e18;
  pricesObject[wHLP] = { price: wHLPRate * 1e12 };

  return getWrites({ chain, timestamp, pricesObject, projectName: "other2", });
}

async function beraborrow(timestamp: number = 0) {
  const chain = "berachain";
  const api = await getApi(chain, timestamp);

  const infraredLogs = await getLogs({ api, target: '0xb71b3DaEA39012Fb0f2B14D2a9C86da9292fC126', eventAbi: 'event NewVault (address _sender, address indexed _asset, address indexed _vault)', fromBlock: 562092, onlyArgs: true, })
  const infraAssets = infraredLogs.map((log: any) => log._asset)
  const names = await api.multiCall({ abi: 'string:name', calls: infraAssets, permitFailure: true, })
  const bbInfraWrappers = infraAssets.filter((_: any, i: number) => names[i] && names[i].startsWith('Beraborrow: '))
  const bbInfraWrapperUnderlyings = await api.multiCall({ abi: 'address:underlying', calls: bbInfraWrappers })
  const balances = await api.multiCall({ abi: 'erc20:balanceOf', calls: bbInfraWrapperUnderlyings.map((target: string, i: number) => ({ target, params: bbInfraWrappers[i] })) })
  const supplies = await api.multiCall({ abi: 'uint256:totalSupply', calls: bbInfraWrappers })
  const tDecimals = await api.multiCall({ abi: 'uint8:decimals', calls: bbInfraWrappers })
  const uDecimals = await api.multiCall({ abi: 'uint8:decimals', calls: bbInfraWrapperUnderlyings })
  const pricesObject: any = {};
  bbInfraWrappers.forEach((wrapper: string, i: number) => {
    if (+supplies[i] === 0) return;
    const price = balances[i] * (10 ** (uDecimals[i] - tDecimals[i])) / supplies[i]
    pricesObject[wrapper] = {
      price,
      underlying: bbInfraWrapperUnderlyings[i],
    }
  })
  return getWrites({ chain, timestamp, pricesObject, projectName: "other2", });
}

async function cabal(timestamp: number = 0) {
  const chain = "initia";
  if (timestamp > 0 && Date.now() / 1000 - timestamp > 3600)
    throw new Error("Timestamp is more than an hour old, this adapter does not support historical prices")

  const REST_URL = 'https://rest.initia.xyz/initia/move/v1/view/json'
  const CABAL_MODULE_ADDRESS = '0x53c3f5d8e11844ba3747ebaec1b2d25051574ffbeedc69d72068395991e3ea28'
  const USDC_INIT_LP_METADATA_ADDRESS = '0x543b35a39cfadad3da3c23249c474455d15efd2f94f849473226dee8a3c7a9e1'

  function toNum(str: any) {
    const clean = String(str).replace(/[^\d.]/g, '');
    return parseFloat(clean);
  }
  async function fetchView(functionName: any, moduleName: any, args: any) {
    const { data: { data }} = await axios.post(REST_URL, {
      address: CABAL_MODULE_ADDRESS,
      module_name: moduleName,
      function_name: functionName,
      args: args,
      typeArgs: []
    });
    return data
  }

  const price = toNum(await fetchView('get_lp_token_value_in_usd', 'utils', [`"${USDC_INIT_LP_METADATA_ADDRESS}"`, '"1000000"']))

  return getWrites({
    chain, timestamp, pricesObject: {
      [USDC_INIT_LP_METADATA_ADDRESS]: {
        price,
        symbol: 'USDC-INIT',
        decimals: 6,
      }
    }, projectName: "other2",
  });
}

export const adapters = {
  solanaAVS,
  wstBFC, stOAS, wSTBT, beraborrow, feUBTC, cabal,
  springSUI: async (timestamp: number = 0) => {
    if (timestamp > 0 && Date.now() / 1000 - timestamp > 86400) {
      throw new Error("Timestamp is more than a day old, this adapter does not support historical prices");
    }
    const chain = "sui"
    const springSUI = '0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI'

    const pool = await getObject('0x15eda7330c8f99c30e430b4d82fd7ab2af3ead4ae17046fcb224aa9bad394f6b');
    const price = pool.fields.storage.fields.total_sui_supply / pool.fields.lst_treasury_cap.fields.total_supply.fields.value

    const [basePrice]: CoinData[] = await getTokenAndRedirectData(["sui"], "coingecko", timestamp,);

    const writes: Write[] = [];
    addToDBWritesList(writes, chain, springSUI, price * basePrice.price, 9, "other2", timestamp, "other", 0.95,);
    return writes;
  }
};
