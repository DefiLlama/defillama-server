import protocols, { Protocol, setProtocolMetadata } from './data'
import type { IParentProtocol } from "./types";
import parentProtocols from "./parentProtocols";

export const treasuries: Protocol[] = [...protocols, ...parentProtocols].filter(i => i.treasury).map((i: Protocol | IParentProtocol) => {
  const clone: Protocol = JSON.parse(JSON.stringify(i))
  clone.id = `${i.id}-treasury`
  clone.module = `treasury/${i.treasury}`
  clone.name = `${i.name} (treasury)`
  clone.category = 'Treasury'
  return clone
})

treasuries.forEach(setProtocolMetadata)

export default treasuries