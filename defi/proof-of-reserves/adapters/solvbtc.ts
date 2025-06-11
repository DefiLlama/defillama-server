import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import axios from 'axios';

const adapter: IPoRAdapter = {
  assetLabel: 'SolvBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    const addresses = (await axios.get('https://raw.githubusercontent.com/solv-finance/solv-protocol-defillama/refs/heads/main/solvbtc.json')).data;
    return await getReserves(options, {
      ethereum: {
        minted: [{address: '0x7A56E1C57C7475CCf742a1832B028F0456652F97'}],
        reserves: {
          tokens: addresses.ethereum.otherDeposit.tokens,
          owners: addresses.ethereum.otherDeposit.depositAddress,
        }
      },
      arbitrum: {
        minted: [{address: '0x3647c54c4c2C65bC7a2D63c0Da2809B399DBBDC0'}],
        reserves: {
          tokens: addresses.arbitrum.otherDeposit.tokens,
          owners: addresses.arbitrum.otherDeposit.depositAddress,
        }
      },
      bsc: {
        minted: [{address: '0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7'}],
        reserves: {
          tokens: ['0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c'],
          owners: addresses.bsc.otherDeposit.depositAddress,
        }
      },
      mantle: {
        reserves: {
          tokens: addresses.mantle.otherDeposit.tokens,
          owners: addresses.mantle.otherDeposit.depositAddress,
        }
      },
      avax: {
        minted: [{address: '0xbc78D84Ba0c46dFe32cf2895a19939c86b81a777'}],
        reserves: {
          tokens: addresses.avax.otherDeposit.tokens,
          owners: addresses.avax.otherDeposit.depositAddress,
        }
      },
      bob: {
        minted: [{address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77'}],
        reserves: {
          tokens: addresses.bob.otherDeposit.tokens,
          owners: addresses.bob.otherDeposit.depositAddress,
        }
      },
      base: {
        minted: [{ address: '0x3B86Ad95859b6AB773f55f8d94B4b9d443EE931f' }],
        reserves: {
          tokens: addresses.base.otherDeposit.tokens,
          owners: addresses.base.otherDeposit.depositAddress,
        }
      },
      merlin: {
        minted: [{ address: '0x41D9036454BE47d3745A823C4aaCD0e29cFB0f71' }],
        reserves: {
          tokens: [
            '0xB880fd278198bd590252621d4CD071b1842E9Bcd',
          ],
          owners: [
            '0x6A57a8D6C4fe64B1FD6E8c3E07b0591d22B7ce7f',
          ],
        }
      },
      linea: {
        minted: [{ address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77' }],
        reserves: {
          tokens: [
            '0x3aab2285ddcddad8edf438c1bab47e1a9d05a9b4',
          ],
          owners: [
            '0x35ce7fa5623b8a5cf1cf87a8bf8d64ad8da1443e',
          ],
        }
      },
      core: {
        minted: [{ address: '0x9410e8052bc661041e5cb27fdf7d9e9e842af2aa' }],
      },
      taiko: {
        minted: [{ address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77' }],
      },
      btr: {
        minted: [{ address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77' }],
      },
      mode: {
        minted: [{ address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77' }],
      },
      corn: {
        minted: [{ address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77' }],
      },
      sonic: {
        minted: [{ address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77' }],
      },
      soneium: {
        minted: [{ address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77' }],
        reserves: {
          tokens: ['0x0555E30da8f98308EdB960aa94C0Db47230d2B9c'],
          owners: ['0xedcd3b3e3d7724908abf5341427143fd2d258e48'],
        }
      },
      rsk: {
        minted: [{ address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77' }],
        reserves: {
          tokens: ['0x542fda317318ebf1d3deaf76e0b632741a7e677d'],
          owners: ['0xa26ddc188b1c07d7f0dcb90827424b14dda2e372',]
        }
      },
      berachain: {
        minted: [{ address: '0x541fd749419ca806a8bc7da8ac23d346f2df8b77' }],
        reserves: {
          tokens: ['0x0555e30da8f98308edb960aa94c0db47230d2b9c'],
          owners: ['0x52be8fe8fed6c8d52a9fd94a10dad12f4ffa9526']
        }
      },
      sei: {
        minted: [{ address: '0x541FD749419CA806a8bc7da8ac23D346f2dF8B77' }],
      },
      era: {
        minted: [{ address: '0x74eD17608cc2B5f30a59d6aF07C9aD1B1aB3A5b1' }],
      },
      ink: {
        minted: [{ address: '0xae4efbc7736f963982aacb17efa37fcbab924cb3' }],
        reserves: {
          tokens: ['0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98'],
          owners: ['0x33b7a7a164b77433a61d4b49bd780a2718812e6e'],
        }
      },
      hyperliquid: {
        minted: [{ address: '0xae4efbc7736f963982aacb17efa37fcbab924cb3' }],
        reserves: {
          tokens: ['0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463'],
          owners: ['0x4ec5bd156776ffbbcababe229a542340e666c1b7'],
        }
      },
      bitcoin: {
        reserves: {
          owners: addresses.bitcoin,
        }
      },
    })
  }
}

export default adapter;


