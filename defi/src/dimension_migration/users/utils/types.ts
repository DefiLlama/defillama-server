export interface ChainAddresses{
    [chain:string]:string[]
}
export type ProtocolAddresses = {
    name:string,
    id:string
    addresses:ChainAddresses
}

export type ExtraProtocolAddresses = {
    name:string,
    id:string
    addresses:ChainAddresses
} | {
    name:string,
    id:string
    getAddresses: ()=>Promise<ChainAddresses>
}