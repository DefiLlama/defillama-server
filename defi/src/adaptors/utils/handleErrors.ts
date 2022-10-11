export enum ERROR_TYPE {
    fetch_chain_failed,
}

export default (e: Error, _type: ERROR_TYPE, _payload?: any) => {
    console.error(e)
}

export function processFailedFetchAdapters () {

}