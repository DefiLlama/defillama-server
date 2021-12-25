import protocols from './protocols/data'
import getProtocol from './getProtocol'
import sluggify from "./utils/sluggify";
import fetch from 'node-fetch';

test("snapshots of responses", async () => {
    const filteredProtocols = protocols.slice(0,10).filter(protocol=>!protocol.name.startsWith('Karura ') && protocol.name !== "Genshiro")
    expect(await Promise.all(filteredProtocols.map(p => getProtocol({
        pathParameters: {
            protocol: sluggify(p)
        }
    } as any) as Promise<any>)))
    .toMatchSnapshot(await Promise.all(filteredProtocols.map(p=>fetch(`https://api.llama.fi/protocol/${sluggify(p)}`).then(data=>data.json()))))
})