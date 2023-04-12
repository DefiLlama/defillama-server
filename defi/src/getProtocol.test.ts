import protocols from './protocols/data'
import getProtocol from './getProtocol'
import sluggify from "./utils/sluggify";
import fetch from 'node-fetch';

jest.setTimeout(20e3)
test("snapshots of responses", async () => {
    const filteredProtocols = protocols.slice(12,15).filter(protocol=>!protocol.name.startsWith('Karura ') && protocol.name !== "Genshiro")
    expect(await Promise.all(filteredProtocols.map(p => getProtocol({
        pathParameters: {
            protocol: sluggify(p)
        }
    } as any)!.then((r:any)=>JSON.parse(r.body)) as Promise<any>)))
    .toEqual(await Promise.all(filteredProtocols.map(p=>fetch(`https://api.llama.fi/protocol/${sluggify(p)}`).then(data=>data.json()))))
})