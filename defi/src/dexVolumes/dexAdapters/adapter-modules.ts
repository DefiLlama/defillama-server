import path from "path";
import getDirectories from "../utils/getDirectories";

function removeDotTs(s: string) {
    const splitted = s.split('.')
    if (splitted.length > 1)
        splitted.pop()
    return splitted.join('.')
}

const volumes = getDirectories(path.resolve('../../adapters/volumes')).map(removeDotTs)
const fees = getDirectories(path.resolve('../../adapters/fees')).map(removeDotTs)

export {
    fees,
    volumes
}