
import './../../utils/failOnError'
import { sendMessage } from "../../../utils/discord";
import * as sdk from '@defillama/sdk';
import { sliceIntoChunks } from "@defillama/sdk/build/util";
import axios from 'axios';
import protocols from '../../../protocols/data'
import { parentProtocolsById } from "../../../protocols/parentProtocols";

const hasCoinInfo = (protocol: any) => protocol.gecko_id || protocol.cmcId || protocol.address

let processedParentProtocols = new Set<string>()

let filteredProtocols = protocols.filter((protocol: any) => {
  if (hasCoinInfo(protocol)) return false
  if (processedParentProtocols.has(protocol.id)) return false
  const parentId = protocol.parentProtocol
  if (!parentId) return true
  if (processedParentProtocols.has(parentId)) return false
  const parentProtocol = parentProtocolsById[parentId]
  if (!parentProtocol) {
    console.warn('No parent protocol found for', protocol.name, 'with ID', parentId);
    return true; // Keep protocol if no parent found
  }
  protocol.parentProtocol = parentProtocol
  return !hasCoinInfo(parentProtocol)
})

const ignoredCoinsSet = new Set([
  '24165',
]);

console.log('Filtered protocols:', filteredProtocols.length, 'from', protocols.length, 'total protocols');

const axiosInstance = axios.create({
  baseURL: "https://pro-api.coinmarketcap.com",
  headers: {
    'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
  }
});

const cacheFile = 'cmc-cache'

async function main() {
  let updateCache = false;
  let cache = await sdk.cache.readCache('cmc-cache') ?? { metadataMap: {} }
  if (!cache.metadataMap) cache = { metadataMap: {} }


  let { data: { data: coinMap } } = await axiosInstance.get('/v1/cryptocurrency/map')
  console.log('Fetched coin map from CoinMarketCap', coinMap.length, 'coins');
  coinMap = coinMap.filter((coin: any) => coin.platform && coin.is_active === 1 && new Date(coin.first_historical_data).getFullYear() >= 2022);
  coinMap.forEach((coin: any) => coin.id = '' + coin.id); // Ensure IDs are strings for consistency



  console.log('Filtered coin map to', coinMap.length, 'coins with platforms');
  const coinsMissingMetadata = coinMap.filter((coin: any) => !cache.metadataMap[coin.id]);
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
      cache.metadataMap[coin.id] = coin
    })


    updateCache = true;
  }


  console.log('needs update:', updateCache)
  if (updateCache)
    await sdk.cache.writeCache(cacheFile, cache)


  const tagStats: any = {}
  const githubCoinsMap: any = {};
  const domainCoinsMap: any = {};
  const twitterCoinsMap: any = {};

  const coinCount = Object.values(cache.metadataMap).length;
  let filteredCount = 0;
  let githubCount = 0;
  let domainCount = 0;
  let twitterCount = 0;

  const getDomain = (url: string) => {
    console.log('getDomain', url)
    return url.split('://')[1].split('/')[0].split('.').slice(-2).join('.').toLowerCase()
  }

  Object.values(cache.metadataMap).forEach((coin: any) => {
    if (!coin.metadata || coin.missingMetadata || ignoredCoinsSet.has(coin.id)) return;
    let { tags, urls, } = coin.metadata;
    if (!tags) tags = []
    if (tags.includes('memes') || tags.includes('pump-fun-ecosystem')) return;
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
        if (handle) {
          if (!domainCoinsMap[handle]) domainCoinsMap[handle] = [];
          domainCoinsMap[handle] = [coin];
          domainCount++;
        }
      })
    }


  })

  console.log({ coinCount, filteredCount, githubCount, domainCount, twitterCount });

  // console.table(Object.entries(tagStats).filter(([_, count]: any) => count > 10).sort((a: any, b: any) => b[1] - a[1]))

  const protocolsFound: any = {}
  filteredProtocols.forEach((protocol: any) => {
    let parentProtocol = parentProtocolsById[protocol.parentProtocol ?? ''] || {}
    let domain = protocol.url?.toLowerCase() || parentProtocol.url?.toLowerCase()

    if (domain) {
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


  console.log('Protocols found:', Object.keys(protocolsFound).length);
  const tableData = Object.values(protocolsFound).map((entry: any) => {
    let coinSet = new Set<string>()
    let coins = entry.coins.filter((coin: any) => {
      if (coinSet.has(coin.id)) return false
      coinSet.add(coin.id)
      return true
    })
    return {
      id: entry.protocol.id,
      name: entry.protocol.name,
      // url: entry.protocol.url || entry.protocol.parentProtocol?.url,
      // twitter: entry.protocol.twitter || entry.protocol.parentProtocol?.twitter,
      // github: entry.protocol.github || entry.protocol.parentProtocol?.github,
      domainK: entry.domainKey,
      twitterK: entry.twitterHandle,
      githubK: entry.githubHandle,
      coins: coins.map((coin: any) => coin.name).join(','),
      coinIds: coins.map((coin: any) => coin.id).join(',')
    }
  })

  console.table(tableData);




  // const message = 'New rekt news post (Add to hack page if missing): \n\n' + featuredTitles.map((post: any) => `[${post.title}](${post.link})`).join('\n');
  // await sendMessage(message, process.env.TEAM_WEBHOOK!, false)
}

main().catch(err => {
  console.error('Error:', err);
}).then(() => process.exit(0))
