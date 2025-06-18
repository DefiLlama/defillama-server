
import '../utils/failOnError'
import { sendMessage } from "../../utils/discord";
import * as sdk from '@defillama/sdk';
import { sliceIntoChunks } from "@defillama/sdk/build/util";
import axios from 'axios';
import protocols from '../../protocols/data'
import parentProtocols, { parentProtocolsById } from "../../protocols/parentProtocols";
import { tableToString } from '../utils';
import { addCGTokenMetadatas, addCMCTokenMetadatas, getAllCGTokenMetadata, getAllCMCTokenMetadata } from '../../../dev-metrics/db';
import { IProtocol } from '../../types';
import { chainCoingeckoIds } from '../../utils/normalizeChain';
import sleep from '../../utils/shared/sleep';

// create chain metadata objects from chainCoingeckoIds like protocols from data.ts
const chains = Object.entries(chainCoingeckoIds).map(([chain, id]: any) => {
  return {
    ...id,
    category: 'chain-listing',
    name: `${chain} (chain)`,
    id: `${chain} (chain)`,
  }
})

const allMetadata = protocols.concat(parentProtocols as IProtocol[], chains)
let _cgMetadataMap: any
let _cmcMetadataMap: any
let cmcSymbolCoinMap: any = {}
let cgSymbolCoinMap: any = {}
const parentChildProtocolMap: any = {} // map of parent id and array of child protocols + parent protocol object

const ignoredDomains = [
  'coinbase.com', 't.me', 'twitter.com', 'binance.com', 'dexscreener.com', 'kraken.com', 'gitbook.io', 'opensea.io', 'pump.fun', 'vercel.app',
]

const configs: any = {
  cmc: {
    getMetadatas: getCMCMetadatas,
    hasCoinInfo: (i: any) => i.metadatas.cmc_ids.some((m: any) => m),
    ignoredCoinsSet: new Set([
      '24165', '35459', '31370', '32882', '33903', '31369', '33834', '21583', '20641',
      '21882', '35458', '36175', '33312', '30141', '36068', '30907', '32194', '35437',
      '24760', '22318', '32690', '29256', '21540', '35293', '33310', '36067', '33652', '32689', '22880', '36289', '29599', '29242', '24875', '28910', '35670', '28909', '23773'
    ])
  },
  cg: {
    getMetadatas: getCGMetadatas,
    hasCoinInfo: (i: any) => i.metadatas.gecko_ids.some((m: any) => m),
    ignoredCoinsSet: new Set([
      'defrogs', 'compounding-open-dollar', 'opyn-squeeth', 'bucket-protocol-buck-stablecoin', 'bob',
    ])
  },
}



async function main() {
  await init()


  const missingCMCData = await getCoinTableData('cmc');
  const missingCGCData = await getCoinTableData('cg');
  const missingSymbols = getMissingSymbols();
  const missingAddresses = getMissingAddresses();

}


main().catch(err => {
  console.error('Error:', err);
}).then(() => process.exit(0))


async function getCoinTableData(coinType: string) {
  if (!configs[coinType]) {
    console.warn(`Unknown coin type: ${coinType}`);
    return;
  }

  const { getMetadatas, hasCoinInfo, ignoredCoinsSet = new Set(), symbolCoinMap, } = configs[coinType];

  console.log(`-----Fetching missing ${coinType} token link------`)
  const existingCoinLinks = new Set(allMetadata.map(hasCoinInfo).filter((id: any) => id));
  const existingDomainsWithCoinLinks = new Set(allMetadata.filter((protocol: any) => hasCoinInfo(protocol) && protocol.url?.includes(('://'))).map((protocol: any) => getDomain(protocol.url!)))
  ignoredDomains.forEach((domain: string) => existingDomainsWithCoinLinks.add(domain.toLowerCase()));

  const cgStablecoinIds = allMetadata.map((i: any) => i.stablecoins).filter((i: any) => i).flat()
  const assetTokenSymbols = allMetadata.map((i: any) => i.assetToken).filter((i: any) => i)
  cgStablecoinIds.forEach((id: string) => {
    existingCoinLinks.add(id)
    if (_cgMetadataMap?.[id])
      assetTokenSymbols.push(_cgMetadataMap[id].symbol)
  })

  assetTokenSymbols.forEach((symbol: string) => {
    let metadata = symbolCoinMap[symbol.toLowerCase()]
    if (metadata)
      existingCoinLinks.add(metadata.id)
  })

  const metadataMap = await getMetadatas();
  const tagStats: any = {}
  const githubCoinsMap: any = {};
  const domainCoinsMap: any = {};
  const twitterCoinsMap: any = {};

  const coinCount = Object.values(metadataMap).length;
  let filteredCount = 0;
  let githubCount = 0;
  let domainCount = 0;
  let twitterCount = 0;

  Object.values(metadataMap).forEach((coin: any) => {
    if (!coin.metadata || coin.missingMetadata || ignoredCoinsSet.has(coin.id) || existingCoinLinks.has(coin.id)) return;
    let { tags, urls, name } = coin.metadata;
    if (!tags) tags = []
    if (tags.includes('memes') || tags.includes('pump-fun-ecosystem')) return;
    name = name.toLowerCase()
    if (['staked ', 'wrapped ', ' usd',].some((i: any) => name.includes(i))) return;
    filteredCount++;
    if (!urls) urls = {}

    tags.forEach((tag: string) => {
      if (!tagStats[tag]) tagStats[tag] = 0
      tagStats[tag]++;
    })
    const { source_code = [], website = [], twitter = [] } = urls

    if (twitter.length > 0) {
      const handles = twitter.map((handle: string) => handle.split('/').pop()?.toLowerCase());
      handles.forEach((handle: any) => {
        if (handle) {
          if (!twitterCoinsMap[handle]) twitterCoinsMap[handle] = [];
          twitterCoinsMap[handle] = [coin];
          twitterCount++;
        }
      })
    }


    if (source_code.length > 0) {
      const githubUrls = source_code.filter((url: string) => url.includes('github.com'));
      const handles = githubUrls.map((url: string) => url.split('/').slice(-1)[0].toLowerCase())
      handles.forEach((handle: any) => {
        if (handle) {
          if (!githubCoinsMap[handle]) githubCoinsMap[handle] = [];
          githubCoinsMap[handle] = [coin];
          githubCount++;
        }
      })
    }

    if (website.length > 0) {
      const handles = website.filter((url: string) => url.includes('://')).map(getDomain)
      handles.forEach((handle: any) => {
        if (existingDomainsWithCoinLinks.has(handle)) return; // Skip domains that already have Coin links
        if (!domainCoinsMap[handle]) domainCoinsMap[handle] = [];
        domainCoinsMap[handle] = [coin];
        domainCount++;
      })
    }


  })

  console.log({ coinCount, filteredCount, githubCount, domainCount, twitterCount });

  // console.table(Object.entries(tagStats).filter(([_, count]: any) => count > 10).sort((a: any, b: any) => b[1] - a[1]))


  let filteredProtocols = protocols.concat(chains).filter((protocol: any) => !hasCoinInfo(protocol))
  console.log('protocols missing coin info:', filteredProtocols.length, 'from', protocols.concat(chains).length, 'total protocols (& chains)');

  const protocolsFound: any = {}
  filteredProtocols.forEach((protocol: any) => {
    let parentProtocol = parentProtocolsById[protocol.parentProtocol ?? ''] || {}
    let domain = protocol.url?.toLowerCase() || parentProtocol.url?.toLowerCase()

    if (domain && domain.includes('://')) {
      let domainKey = getDomain(domain)
      if (domainCoinsMap[domainKey]) {
        protocolsFound[protocol.id] = {
          protocol,
          domain: true,
          domainKey,
          coins: [...domainCoinsMap[domainKey]]
        }
      }
    }

    let twitterHandle = protocol.twitter?.toLowerCase() || parentProtocol.twitter?.toLowerCase()

    if (twitterHandle) {
      if (twitterCoinsMap[twitterHandle]) {
        if (!protocolsFound[protocol.id])
          protocolsFound[protocol.id] = {
            protocol,
            twitter: true,
            twitterHandle,
            coins: [...twitterCoinsMap[twitterHandle]]
          }
        else {
          protocolsFound[protocol.id].coins.push(...twitterCoinsMap[twitterHandle])
          protocolsFound[protocol.id].twitter = true
          protocolsFound[protocol.id].twitterHandle = twitterHandle

        }

      }
    }

    let githubHandles = protocol.github || parentProtocol.github

    if (githubHandles) {
      for (const handle of githubHandles) {
        let githubHandle = handle.toLowerCase()
        if (githubCoinsMap[githubHandle]) {
          if (!protocolsFound[protocol.id])
            protocolsFound[protocol.id] = {
              protocol,
              github: true,
              githubHandle,
              coins: [...githubCoinsMap[githubHandle]]
            }
          else {
            protocolsFound[protocol.id].coins.push(...githubCoinsMap[githubHandle])
            protocolsFound[protocol.id].github = true
            protocolsFound[protocol.id].githubHandle = githubHandle
          }
        }
      }
    }


  })


  console.log('Protocols found:', Object.keys(protocolsFound).length, `[${coinType}]`);
  const tableData = Object.values(protocolsFound).map((entry: any, idx: number) => {
    let coinSet = new Set<string>()
    let coins = entry.coins.filter((coin: any) => {
      if (coinSet.has(coin.id)) return false
      coinSet.add(coin.id)
      return true
    })
    return {
      // idx: idx + 1,
      // id: entry.protocol.id,
      name: entry.protocol.name,
      // url: entry.protocol.url || entry.protocol.parentProtocol?.url,
      // twitter: entry.protocol.twitter || entry.protocol.parentProtocol?.twitter,
      // github: entry.protocol.github || entry.protocol.parentProtocol?.github,
      domainK: entry.domainKey ?? '',
      twitterK: entry.twitterHandle ?? '',
      // githubK: entry.githubHandle ?? '',
      symbols: coins.map((coin: any) => coin.symbol).join(', ').slice(0, 16),
      coinIds: coins.map((coin: any) => coin.id).join(', ').slice(0, 25),
      coins: coins.map((coin: any) => coin.name).join(', ').slice(0, 35),
      category: entry.protocol.category
    }
  })

  // sort table data by domainK
  tableData.sort(sortTableData);

  if (tableData.length)
    console.table(tableData)

  return tableData;


  // if (process.env.UNLISTED_WEBHOOK) {
  //   const tableString = tableToString(tableData, Object.keys(tableData[0]))
  //   const message = `
  //   Protocols missing coin info (check and add coin info to the protocol/parent protocol):\n\n${tableString}\n\n
  //   Total: ${tableData.length} protocols
  //   To ignore coins from this list, add the cmc id here: https://github.com/DefiLlama/defillama-server/blob/master/defi/src/api2/scripts/checkForProtocolsMissingTokenInfo.ts#L45
  //   `
  //   await sendMessage(message, process.env.UNLISTED_WEBHOOK!, false)
  // }
}

async function getCMCMetadatas() {
  if (_cmcMetadataMap)
    return _cmcMetadataMap;

  const axiosInstance = axios.create({
    baseURL: "https://pro-api.coinmarketcap.com",
    headers: {
      'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
    }
  });
  const metadataMap: any = await getAllCMCTokenMetadata();
  _cmcMetadataMap = metadataMap;
  // return metadataMap
  let { data: { data: coinMap } } = await axiosInstance.get('/v1/cryptocurrency/map')
  console.log('Fetched coin map from CoinMarketCap', coinMap.length, 'coins');
  coinMap = coinMap.filter((coin: any) => coin.platform && coin.is_active === 1 && new Date(coin.first_historical_data).getFullYear() >= 2022);
  coinMap.forEach((coin: any) => coin.id = '' + coin.id); // Ensure IDs are strings for consistency

  console.log('Filtered coin map to', coinMap.length, 'coins with platforms');
  const coinsMissingMetadata = coinMap.filter((coin: any) => !metadataMap[coin.id]);
  console.log('Coins missing metadata:', coinsMissingMetadata.length);
  const idChunks = sliceIntoChunks(coinsMissingMetadata, 99);
  console.log('Processing', idChunks.length, 'chunks of IDs');

  let i = 0
  for (const chunk of idChunks) {
    const coinIdMap: any = {}
    chunk.forEach((coin: any) => coinIdMap[coin.id] = coin)

    const { data: { data: metadataMap } } = await axiosInstance.get('/v1/cryptocurrency/info', {
      params: {
        id: chunk.map((coin: any) => coin.id).join(','),
        skip_invalid: true
      }
    });

    console.log(i++, 'Fetched metadata for chunk', chunk.length, 'coins', Object.keys(metadataMap).length, 'metadata entries found');

    for (const id of Object.keys(metadataMap)) {
      if (!coinIdMap[id]) {
        console.log(id, metadataMap[id])
        console.log('Coin ID not found in chunk:', id);
      } else coinIdMap[id].metadata = metadataMap[id]
    }

    chunk.forEach((coin: any) => {
      if (!coin.metadata) {
        console.log('No metadata for coin', coin.id, coin.name);
        coin.metadata = {}
        coin.missingMetadata = true
      }
      metadataMap[coin.id] = coin
    })

    console.log('Chunk processed, writing cmc metadata to db', chunk.length);
    await addCMCTokenMetadatas(chunk)


  }

  return metadataMap
}


async function getCGMetadatas() {
  if (_cgMetadataMap)
    return _cgMetadataMap;

  const axiosInstance = axios.create({
    baseURL: "https://pro-api.coingecko.com/api",
    headers: {
      'x-cg-pro-api-key': process.env.CG_KEY
    },
  });
  const metadataMap: any = await getAllCGTokenMetadata();
  _cgMetadataMap = metadataMap;
  // return transformMetadatas(metadataMap)
  let { data: coinMap } = await axiosInstance.get('/v3/coins/list', { params: { include_platform: true } });
  console.log('Fetched coin map from cg', coinMap.length, 'coins', 'already have metadata for', Object.keys(metadataMap).length, 'coins');
  coinMap = coinMap.filter((coin: any) => !metadataMap[coin.id]);
  console.log('Filtered coin map to', coinMap.length, 'coins with platforms');

  let i0 = 0
  coinMap = coinMap
    .map((coin: any) => ({ coin, sort: Math.random() }))
    .sort((a: any, b: any) => a.sort - b.sort)
    .map(({ coin }: any) => coin);
  for (const coin of coinMap) {
    try {
      const { data: metadata } = await axiosInstance.get(`/v3/coins/${coin.id}`, { params: { market_data: false, localization: false, tickers: false, } })
      console.log(i0++, '/', coinMap.length, 'Fetched metadata for coin', coin.id, coin.name, Number(i0 * 100 / coinMap.length).toFixed(3), '%', new Date().toISOString());
      await addCGTokenMetadatas([metadata])
      await sleep(300)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
        // console.warn(`Too many requests for coin ${coin.id}, retrying after 60 seconds...`);
        await sleep(10000);
      } else {
        console.error(`Error fetching metadata for coin ${coin.id}:`);
        // throw error; // Re-throw the error to stop processing
      }
    }
  }

  return transformMetadatas(metadataMap)

  function transformMetadatas(obj: any) {
    Object.entries(obj).forEach(([id, metadata]: any) => obj[id] = transformToCMCFormat(metadata))
    return obj;
  }

  function transformToCMCFormat(metadata: any) {
    metadata.metadata = metadata
    metadata.tags = metadata.categories || [];
    metadata.urls = {
      source_code: Object.values(metadata.links?.repos_url ?? {}).flat().filter(((url: string) => {
        return typeof url === 'string' && url.includes('github.com') && url.includes('://')
      }) as any),
      website: metadata.links?.homepage?.filter((url: string) => url.includes('://')) || [],
      twitter: metadata.links?.twitter_screen_name ? [`https://twitter.com/${metadata.links.twitter_screen_name}`] : [],
    }
    return metadata;
  }
}

function getMissingSymbols() {
  const missingSymbols: any = []
  protocols.concat(parentProtocols as any).forEach((protocol: any) => {
    if (protocol.symbol && protocol.symbol !== '-') return;
    if (protocol.gecko_id) {
      if (_cgMetadataMap?.[protocol.gecko_id]) {
        missingSymbols.push({
          protocolId: protocol.id,
          symbol: _cgMetadataMap[protocol.gecko_id].metadata.symbol,
          source: 'cg',
        });
        return;
      } else {
        console.warn(`No CG metadata found for protocol ${protocol.name} (${protocol.id}) with gecko_id ${protocol.gecko_id}`);
      }
    } else if (protocol.cmcId) {
      if (_cmcMetadataMap?.[protocol.cmcId]) {
        missingSymbols.push({
          protocolId: protocol.id,
          symbol: _cmcMetadataMap[protocol.cmcId].metadata.symbol,
          source: 'cmc',
        });
        return;
      } else {
        console.warn(`No CMC metadata found for protocol ${protocol.name} (${protocol.id}) with cmcId ${protocol.cmcId}`);
      }
    }
  })

  if (missingSymbols.length) {
    console.log('Protocol listings missing symbol:', missingSymbols.length);
    console.table(missingSymbols)
  }
  return missingSymbols
}

function getMissingAddresses() {
  const missingAddresses: any = []
  protocols.concat(parentProtocols as any).forEach((protocol: any) => {
    if (protocol.address && protocol.address !== '-') return;
    if (protocol.gecko_id) {
      if (_cgMetadataMap?.[protocol.gecko_id]) {
        const { contract_address, asset_platform_id } = _cgMetadataMap[protocol.gecko_id].metadata
        if (!contract_address || !asset_platform_id) return;
        missingAddresses.push({
          protocolId: protocol.id,
          address: `${asset_platform_id}:${contract_address}`,
          source: 'cg',
        });
        return;
      } else {
        console.warn(`No CG metadata found for protocol ${protocol.name} (${protocol.id}) with gecko_id ${protocol.gecko_id}`);
      }
    } else if (protocol.cmcId) {
      if (_cmcMetadataMap?.[protocol.cmcId]) {
        const { platform: { name, token_address } = {} } = _cmcMetadataMap[protocol.cmcId].metadata;
        if (!name || !token_address) return;
        missingAddresses.push({
          protocolId: protocol.id,
          address: `${name}:${token_address}`,
          source: 'cmc',
        });
        return;
      } else {
        console.warn(`No CMC metadata found for protocol ${protocol.name} (${protocol.id}) with cmcId ${protocol.cmcId}`);
      }
    }
  })

  if (missingAddresses.length) {
    console.log('Protocol listings missing address:', missingAddresses.length);
    console.table(missingAddresses)
  }

  return missingAddresses
}

const sortTableData = (a: any, b: any) => {
  if (a.category === 'chain-listing') return -1; // Chain listings should come first
  if (b.category === 'chain-listing') return 1; // Chain listings should come first
  if (a.domainK < b.domainK) return -1;
  if (a.domainK > b.domainK) return 1;
  if (a.twitterK < b.twitterK) return -1;
  if (a.twitterK > b.twitterK) return 1;
  return 0;
}

const getDomain = (url: string) => {
  // console.log('getDomain', url)
  return url.split('://')[1].split('/')[0].split('.').slice(-2).join('.').toLowerCase()
}


async function init() {

  // we want to ignore protocols if either they/their parent protocol or their siblings have cg/cmc id
  protocols.forEach((protocol: any) => {
    if (protocol.parentProtocol) {
      if (!parentChildProtocolMap[protocol.parentProtocol]) {
        parentChildProtocolMap[protocol.parentProtocol] = [];
        let parentProtocol = parentProtocolsById[protocol.parentProtocol]
        if (!parentProtocol) {
          console.warn('No parent protocol found for', protocol.name, 'with ID', protocol.parentProtocol);
        }
        parentChildProtocolMap[protocol.parentProtocol].push(parentProtocol);
      }
      parentChildProtocolMap[protocol.parentProtocol].push(protocol);
    }
  })

  allMetadata.forEach((protocol: any) => {
    let metadataItems = [protocol]
    if (protocol.parentProtocol && parentChildProtocolMap[protocol.parentProtocol])
      metadataItems = parentChildProtocolMap[protocol.parentProtocol]
    protocol.metadatas = {
      gecko_ids: metadataItems.map((p: any) => p.gecko_id).filter((id: any) => id),
      cmc_ids: metadataItems.map((p: any) => p.cmcId).filter((id: any) => id),
      twitter: metadataItems.map((p: any) => p.twitter).filter((id: any) => id),
      github: metadataItems.map((p: any) => p.github).filter((id: any) => id),
      assetTokens: metadataItems.map((p: any) => p.assetToken).filter((id: any) => id),
      stablecoins: metadataItems.map((p: any) => p.stablecoins).filter((id: any) => id).flat(),
      addresses: metadataItems.map((p: any) => p.address).filter((id: any) => id),
    }
  })

  // load coin metadatas from db
  const [cmcMetadataMap, cgMetadataMap] = await Promise.all([getCMCMetadatas(), getCGMetadatas()]);

  Object.values(cgMetadataMap).forEach((metadata: any) => {
    if (metadata.symbol) {
      const symbol = metadata.symbol.toLowerCase();
      cgSymbolCoinMap[symbol] = metadata;
    }
  })

  Object.values(cmcMetadataMap).forEach((metadata: any) => {
    if (metadata.symbol) {
      const symbol = metadata.symbol.toLowerCase();
      cmcSymbolCoinMap[symbol] = metadata;
    }
  })
  configs.cmc.symbolCoinMap = cmcSymbolCoinMap;
  configs.cg.symbolCoinMap = cgSymbolCoinMap;
}