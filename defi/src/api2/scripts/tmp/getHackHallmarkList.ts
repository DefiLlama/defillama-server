import axios from 'axios'
import appMetadata from '../../metadata.json'
const protocolMetadataMap: any = {};

(appMetadata as any).protocols.forEach((protocol: any) => {
  if (protocol.hallmarks?.length) {
    protocolMetadataMap[protocol.id] = protocol;
  }
})

async function getHackHallmarkList() {
  const { data: hacks } = await axios.get('https://api.llama.fi/hacks')
  const overlapList: any = []
  const diffRange = 10 * 24 * 60 * 60 
  for (const hack of hacks) {
    if (!hack.defillamaId || !protocolMetadataMap[hack.defillamaId]) continue;
    const hallmarks = protocolMetadataMap[hack.defillamaId].hallmarks 
    for (const hallmark of hallmarks) {
      const timeDiff = Math.abs(hack.date - hallmark[0]);
      console.log(`Checking hack: ${hack.title} (${hack.defillamaId}) against hallmark: ${hallmark[1]} (${hallmark[0]}) - Time difference: ${timeDiff} seconds`);
      if (timeDiff < diffRange) {
        overlapList.push({
          // protocolId: hack.defillamaId,
          // protocolName: protocolMetadataMap[hack.defillamaId].name,
          module: protocolMetadataMap[hack.defillamaId].module,
          hackTitle: hack.classification,
          hallmarkText: hallmark[1].slice(0, 40),
          // timeDiff,
          time: Math.floor(timeDiff * 10/diffRange),
          hackTimestamp: new Date(hack.date * 1000).toISOString().slice(0, 10),
          hallmarkTimestamp: new Date(hallmark[0] * 1000).toISOString().slice(0, 10),
        });
      }

    }
  }

  console.table(overlapList)
}

getHackHallmarkList()
  .catch((error) => {
    console.error('Error fetching Hack Hallmark List:', error)
  }).then(() => {
    process.exit(0)
  })