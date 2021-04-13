import protocols from '../protocols/data'

export function getProtocol(name:string){
    const protocol = protocols.find(p=>p.name.toLowerCase()===name.toLowerCase());
    if(protocol === undefined){
        throw new Error("No protocol with that name")
    }
    return protocol
}