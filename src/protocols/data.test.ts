import protocols from "./data";
import {baseIconsUrl} from '../constants'
import {normalizeChain} from '../utils/normalizeChain'
const fs = require('fs')

test("all the dynamic imports work", async () => {
  for (const protocol of protocols) {
    const module = await import(`../../DefiLlama-Adapters/projects/${protocol.module}`);
    const chains = protocol.chains.map(chain=>normalizeChain(chain))
    Object.keys(module).forEach(key=>{
      if(key !== "fetch" && key !== 'tvl' && key !== 'default' && typeof module[key] === 'object' && module[key] !== null){
        if(!chains.includes(key)){
          throw new Error(`${protocol.name} doesn't include chain ${key}`)
        }
      }
    })
  }
});

test("no id is repeated", async () => {
  const ids = [];
  for (const protocol of protocols) {
    expect(ids).not.toContain(protocol.id);
    ids.push(protocol.id);
  }
});

test("icon exists", async () => {
  for (const protocol of protocols) {
    const icon = protocol.logo?.substr(baseIconsUrl.length+1)
    if(icon !== undefined){
      const path = `./icons/${icon}`
      if(!fs.existsSync(path)){
        throw new Error(`Icon ${path} doesn't exist`)
      }
    }
  }
});