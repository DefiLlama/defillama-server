
const { AdapterType } = require('@defillama/dimension-adapters/adapters/types');
import loadAdaptorsData from "../../src/adaptors/data"
const adapterTypes = Object.values(AdapterType)


export const dimensionFormChoices: any = {
  adapterTypes,
  adapterTypeChoices: {},
}

adapterTypes.forEach((adapterType: any) => {
  const { protocolAdaptors } = loadAdaptorsData(adapterType)
  dimensionFormChoices.adapterTypeChoices[adapterType] = protocolAdaptors.map((p: any) => p.displayName)
})
