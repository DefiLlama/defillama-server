export interface IAdapterInfo {
  id: string
  chain: string
  timestamp: number
  version?: string
}

export async function handleAdapterError(e: Error, adapterInfo?: IAdapterInfo) {
  // TODO: handle error properly
  console.error(adapterInfo)
  console.error(e)
  throw new Error(`Couldn´t get volume for ${JSON.stringify(adapterInfo)}`)
}