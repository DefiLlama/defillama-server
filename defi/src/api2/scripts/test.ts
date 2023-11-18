import protocols from "../../protocols/data";
import parentProtocols from "../../protocols/parentProtocols";
import entities from "../../protocols/entities";
import treasuries from "../../protocols/treasury";
import PromisePool from "@supercharge/promise-pool";
import sluggify from '../../utils/sluggify';
import axios from "axios";

const API_URL = process.env.API_URL || 'http://localhost:5001'

async function updateAllCache() {

  // let actions = [protocols, entities, treasuries].flat()
  let actions = [protocols,].flat()
  shuffleArray(actions) // randomize order of execution
  await PromisePool
    .withConcurrency(42)
    .for(actions.slice(0, 310))
    .process(updateProtocolCache);
}

async function updateProtocolCache(protocolData: any) {
  const a = performance.now()
  await axios.get(`${API_URL}/protocol/${sluggify(protocolData)}`)
  const b = performance.now()
  console.log(`Updated ${protocolData.name} in ${((b - a)/1e3).toFixed(3)}`)
}

updateAllCache().then(() => {
  console.log('Done!!!')
  process.exit(0)
})

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}