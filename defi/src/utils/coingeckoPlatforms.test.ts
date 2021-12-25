import { chainToCoingeckoId } from "@defillama/sdk/build/computeTVL/index"
import {platformMap} from "./shared/coingeckoPlatforms"

test("platformMap", () => {
    const sdkPlatforms = Object.entries(chainToCoingeckoId).reduce((o: any, i) => { o[i[1]] = i[0]; return o }, {})
    expect(platformMap).toEqual(sdkPlatforms)
    console.log(platformMap)
})