import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import axios from 'axios';

const adapter: IPoRAdapter = {
  assetLabel: 'PumpBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = (await axios.get('https://dashboard.pumpbtc.xyz/api/dashboard/asset/tokenowners')).data.data;
    return await getReserves(options, {
      ethereum: {
        minted: [{address: '0xf469fbd2abcd6b9de8e169d128226c0fc90a012e'}],
        reserves: {
          tokens: addresses.ethereum.tokens,
          owners: addresses.ethereum.owners,
        },
      },
      bsc: {
        minted: [{address: '0xf9C4FF105803A77eCB5DAE300871Ad76c2794fa4'}],
        reserves: {
          tokens: addresses.bsc.tokens,
          owners: addresses.bsc.owners,
        },
      },
      mantle: {
        minted: [{address: '0xc75d7767f2edfbc6a5b18fc1fa5d51ffb57c2b37'}],
        reserves: {
          tokens: addresses.mantle.tokens,
          owners: addresses.mantle.owners,
        },
      },
      bob: {
        minted: [{address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E'}],
        reserves: {
          tokens: addresses.bob.tokens,
          owners: addresses.bob.owners,
        },
      },
      base: {
        minted: [{address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e'}],
        reserves: {
          tokens: addresses.base.tokens,
          owners: addresses.base.owners,
        },
      },
      arbitrum: {
        minted: [{address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e'}],
        reserves: {
          tokens: addresses.arbitrum.tokens,
          owners: addresses.arbitrum.owners,
        },
      },
      morph: {
        minted: [{address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E'}],
        reserves: {
          tokens: addresses.morph.tokens,
          owners: addresses.morph.owners,
        },
      },
      sei: {
        minted: [{address: '0xb45aB56AafB1fFb21eE36C9Dee3B7D8ec5779fC8'}],
        reserves: {
          tokens: addresses.sei.tokens,
          owners: addresses.sei.owners,
        },
      },
      avax: {
        minted: [{address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E'}],
      },
      zircuit: {
        minted: [{address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e'}],
      },
      core: {
        minted: [{address: '0x5a2aa871954eBdf89b1547e75d032598356caad5'}],
      },
      corn: {
        minted: [{address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e'}],
      },
      zeta: {
        minted: [{address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E'}],
      },
      zklink: {
        minted: [{address: '0xDAB5cD46A968aDb6911613896fC61b8B62Cf3B2C'}],
      },
      linea: {
        minted: [{address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e'}],
      },
      taiko: {
        minted: [{address: '0xDBc80A09dE9b075f9380801De2030B3467e3B8FA'}],
      },
      optimism: {
        minted: [{address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e'}],
      },
      hemi: {
        minted: [{address: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e'}],
      },
      soneium: {
        minted: [{address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E'}],
      },
      klaytn: {
        minted: [{address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E'}],
      },
      ink: {
        minted: [{address: '0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E'}],
      },
      bitcoin: {
        reserves: {
          owners: addresses.bitcoin.owners,
        }
      },
    })
  }
}

export default adapter;


