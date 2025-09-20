import { Protocol } from "../../../protocols/data";
import { AdaptorsConfig, IJSON } from "../types"
import { getMethodologyDataByBaseAdapter } from "../../utils/getAllChainsFromAdaptors";
import { ProtocolAdaptor } from "../types";
import { Adapter, AdapterType, BaseAdapter, } from "@defillama/dimension-adapters/adapters/types";
import { IParentProtocol } from "../../../protocols/types";

export function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

export function notNull<T>(x: T | null): x is T {
  return x !== null;
}

interface IImportObj {
  module: { default: Adapter },
  codePath: string
  moduleFilePath: string
}
type IImportsMap = IJSON<IImportObj>


export function generateProtocolAdaptorsList2({ allImports, config, adapterType, configMetadataMap }: { allImports: IImportsMap, config: AdaptorsConfig, adapterType?: AdapterType, configMetadataMap: IJSON<any> }): ProtocolAdaptor[] {
  const response = [] as ProtocolAdaptor[]
  Object.entries(allImports).forEach(([adapterKey, adapterObj]) => {

    try {
      let configObj = config[adapterKey]
      if (!configObj) return;

      const protocolId = configObj.id
      let moduleObject = allImports[adapterKey].module.default as any
      let protocol: Protocol | IParentProtocol= configMetadataMap[adapterKey]
      let baseModuleObject = {} as BaseAdapter
      let chains: string[] = []
      let childProtocols: ProtocolAdaptor[] = []

      if (!moduleObject) throw new Error(`No module found for ${adapterKey}`)
      if (!protocolId) throw new Error(`No protocol id found for ${adapterKey}` + JSON.stringify(protocol))

      const protocolType = (moduleObject as any).protocolType
      baseModuleObject = moduleObject.adapter!

      if (!protocol!) throw new Error(`No protocol found for ${adapterKey}`)
      if (!baseModuleObject) throw "Unable to find the module adapter, please check the breakdown keys or config module names"


      chains = Object.keys(baseModuleObject)
      

      const infoItem: ProtocolAdaptor = {
        ...protocol!,
        ...configObj,
        id: protocolId,
        id2: protocolId,
        defillamaId: protocol.id,
        module: adapterKey,
        config: { ...configObj, },
        chains,
        chain: (protocol as any)!.chain ?? chains[0],
        logo: getLlamaoLogo(protocol!.logo),
        displayName: (protocol as any).displayName ?? protocol!.name,
        protocolType,
        methodologyURL: 'https://github.com/DefiLlama/dimension-adapters/blob/master/' + adapterObj.codePath,
        methodology: undefined,
        _stat_adapterVersion: adapterObj.module.default?.version ?? 1,
        _stat_runAtCurrTime: JSON.stringify(adapterObj.module.default ?? '').includes('runAtCurrTime'),
        _stat_allowNegative: !!adapterObj.module.default?.allowNegativeValue,
        doublecounted: moduleObject.doublecounted ?? false,
      } as any

      // mark all interface volume as doublecounted
      if ((adapterType === AdapterType.DERIVATIVES || adapterType === AdapterType.DEXS) && infoItem.category === 'Interface') 
        infoItem.doublecounted = true

      const methodology = getMethodologyDataByBaseAdapter(moduleObject, adapterType, infoItem.category)
      if (methodology) infoItem.methodology = methodology
      if (childProtocols.length > 0) infoItem.childProtocols = childProtocols

      response.push(infoItem)

    } catch (e: any) {
      console.error(`Missing info for ${adapterKey} on ${adapterType}, skipping... error: ${e?.message ?? e}`)
    }
  })
  return response
}

const getLlamaoLogo = (logo: string | null) => {
  if (!logo) return logo
  if (logo.includes('chains')) return logo.replace("https://icons.llama.fi/", "https://icons.llamao.fi/icons/")
  return logo.replace("https://icons.llama.fi/", "https://icons.llamao.fi/icons/protocols/")
}
