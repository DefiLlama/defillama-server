import { baseIconsUrl } from "../constants";
import type { IParentProtocol } from "./types";

/*
    leave `chains` and `category` as an empty array because we fill them based on their child protocols chains and category in api response
*/

const parentProtocols: IParentProtocol[] = [
  {
    "id": "parent#aave",
    "name": "AAVE",
    "url": "https://aave.com\r\n",
    "description": "Aave is an Open Source and Non-Custodial protocol to earn interest on deposits and borrow assets",
    "logo": "https://icons.llama.fi/aave.png",
    "chains": [],
    "gecko_id": "aave",
    "cmcId": "7278",
    "treasury": "aave.js",
    "twitter": "aave",
    "governanceID": [
      "snapshot:aave.eth",
      "eip155:1:0xEC568fffba86c094cf06b22134B23074DFE2252c"
    ],
    "wrongLiquidity": true,
    "github": [
      "aave",
      "bgd-labs"
    ]
  },
  {
    "id": "parent#sushi",
    "name": "Sushi",
    "url": "https://sushi.com/",
    "description": "A fully decentralized protocol for automated liquidity provision on Ethereum.\r\n",
    "logo": "https://icons.llama.fi/sushi.jpg",
    "gecko_id": "sushi",
    "cmcId": "6758",
    "chains": [],
    "twitter": "SushiSwap",
    "treasury": "sushiswap.js",
    "governanceID": [
      "snapshot:sushigov.eth"
    ],
    "github": [
      "sushiswap"
    ]
  },
  {
    "id": "parent#sun",
    "name": "SUN",
    "url": "https://sun.io",
    "description": "First integrated platform for stablecoin swap, stake-mining, and self-governance on TRON",
    "logo": "https://icons.llama.fi/sun.jpg",
    "gecko_id": "sun-token",
    "cmcId": "10529",
    "chains": [],
    "twitter": "sunpumpmeme",
    "github": [
      "sunswapteam"
    ]
  },
  {
    "id": "parent#benqi",
    "name": "Benqi",
    "url": "https://benqi.fi",
    "description": "BENQI is a non-custodial liquidity market protocol, built on Avalanche. The protocol enables users to effortlessly lend, borrow, and earn interest with their digital assets.",
    "logo": "https://icons.llama.fi/benqi-lending.jpg",
    "gecko_id": "benqi",
    "cmcId": "9288",
    "treasury": "benqi.js",
    "chains": [],
    "twitter": "BenqiFinance",
    "github": [
      "Benqi-fi"
    ]
  },
  {
    "id": "parent#increment-finance",
    "name": "Increment Finance",
    "url": "https://increment.fi",
    "description": "Increment Finance, One-stop DeFi Platform on Flow Blockchain.",
    "logo": "https://icons.llama.fi/increment-lending.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "incrementfi",
    "github": [
      "IncrementFi"
    ]
  },
  {
    "id": "parent#pods-finance",
    "name": "Pods",
    "url": "https://www.pods.finance/",
    "description": "Building DeFi, Strategies, primitives and tooling. Welcome to Pods.",
    "logo": "https://icons.llama.fi/pods-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "PodsFinance",
    "github": [
      "pods-finance"
    ]
  },
  {
    "id": "parent#apeswap",
    "name": "ApeBond",
    "url": "https://ape.bond/",
    "description": "ApeSwap has rebranded to ApeBond. ApeBond is an On-Chain OTC Marketplace, offering the best way for projects to raise funds with their native token. It stands out as the #1 bonding protocol in DeFi, known for its proven track record and continuous growth across multiple chains.",
    "logo": "https://icons.llama.fi/apebond.png",
    "gecko_id": "abond",
    "cmcId": "29157",
    "chains": [],
    "twitter": "ApeBond",
    "governanceID": [
      "snapshot:apeswap-finance.eth"
    ],
    "github": [
      "ApeSwapFinance"
    ]
  },
  {
    "id": "parent#value-finance",
    "name": "Value Finance",
    "url": "https://valuedefi.io",
    "description": "The Value DeFi protocol is a platform and suite of products that aim to bring fairness, true value, and innovation to Decentralized Finance.`",
    "logo": "https://icons.llama.fi/value finance.png",
    "gecko_id": "value-liquidity",
    "cmcId": "1183",
    "chains": [],
    "twitter": "value_defi",
    "github": [
      "valuedefi"
    ]
  },
  {
    "id": "parent#magik-finance",
    "name": "Magik Finance",
    "url": "https://magik.finance/",
    "description": "Yield Optimization as a Service and Algorithmic token pegged to $FTM on the Fantom Opera network.",
    "logo": "https://icons.llama.fi/magik-finance.png",
    "gecko_id": "magik",
    "cmcId": "17941",
    "chains": [],
    "twitter": "MagikDotFinance"
  },
  {
    "id": "parent#huckleberry",
    "name": "Huckleberry",
    "url": "https://www.huckleberry.finance/",
    "description": "Huckleberry is a community driven AMM crosschain DEX and lendin' platform built on Moonriver and CLV.",
    "logo": "https://icons.llama.fi/huckleberry.png",
    "gecko_id": "huckleberry",
    "cmcId": "12922",
    "chains": [],
    "twitter": "HuckleberryDEX",
    "governanceID": [
      "snapshot:huckleberrydex.eth"
    ],
    "github": [
      "HuckleberryDex"
    ]
  },
  {
    "id": "parent#mm-finance",
    "name": "MM Finance",
    "url": "https://linktr.ee/madmeerkat",
    "description": "DeFi Ecosystem on Cronos and AMM on Polygon",
    "logo": "https://icons.llama.fi/mm-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "MMFcrypto",
    "governanceID": [
      "snapshot:mmfinance.eth"
    ]
  },
  {
    "id": "parent#mycelium",
    "name": "Mycelium",
    "url": "https://mycelium.xyz",
    "description": "Previously Tracer DAO. Trade with liquidity, leverage and low fees.",
    "logo": "https://icons.llama.fi/mycelium.jpg",
    "gecko_id": "mycelium",
    "cmcId": "21437",
    "chains": [],
    "twitter": "mycelium_xyz",
    "governanceID": [
      "snapshot:tracer.eth",
      "snapshot:myceliumgrowth.eth"
    ],
    "github": [
      "mycelium-ethereum"
    ]
  },
  {
    "id": "parent#bancor",
    "name": "Bancor",
    "url": "https://app.bancor.network/",
    "description": "Bancor is an on-chain liquidity protocol that enables automated, decentralized exchange on Ethereum and across blockchains.",
    "logo": "https://icons.llama.fi/bancor.png",
    "gecko_id": "bancor",
    "cmcId": "1727",
    "chains": [],
    "twitter": "Bancor",
    "governanceID": [
      "snapshot:bancornetwork.eth"
    ],
    "github": [
      "bancorprotocol"
    ]
  },
  {
    "id": "parent#spiritswap",
    "name": "SpiritSwap",
    "url": "https://app.spiritswap.finance/#/",
    "description": "AMM and Lending protocol on Fantom",
    "logo": "https://icons.llama.fi/spiritswap.jpg",
    "gecko_id": "spiritswap",
    "cmcId": "1359",
    "chains": [],
    "twitter": "Spirit_Swap",
    "governanceID": [
      "snapshot:spiritswap.eth"
    ],
    "github": [
      "Spirit-DAO"
    ]
  },
  {
    "id": "parent#interlay",
    "name": "Interlay",
    "url": "https://interlay.io/",
    "description": "Fully trustless and decentralized Bitcoin bridge and BTC DeFi hub",
    "logo": "https://icons.llama.fi/interlay.png",
    "gecko_id": "interlay",
    "cmcId": "20366",
    "chains": [],
    "twitter": "InterlayHQ",
    "github": [
      "interlay"
    ]
  },
  {
    "id": "parent#frax-finance",
    "name": "Frax Finance",
    "url": "https://frax.finance/",
    "description": "FRAX is a dollar-pegged stablecoin that uses AMO smart contracts and permissionless, non-custodial subprotocols as stability mechanisms. The two internal subprotocols used as stability mechanisms are Fraxlend, a decentralized lending market and Fraxswap, an automated market maker (AMM) with special features. The external subprotocol used as a stability mechanism is Curve. Additional subprotocols and AMOs can be added with governance allowing FRAX to incorporate future stability mechanisms seamlessly as they are discovered",
    "logo": "https://icons.llama.fi/frax finance.png",
    "gecko_id": "frax-share",
    "cmcId": "6953",
    "chains": [],
    "twitter": "fraxfinance",
    "treasury": "frax.js",
    "governanceID": [
      "snapshot:frax.eth",
      "compound:ethereum:0xd74034c6109a23b6c7657144cacbbbb82bdcb00e"
    ],
    "github": [
      "FraxFinance"
    ]
  },
  {
    "id": "parent#compound-finance",
    "name": "Compound Finance",
    "treasury": "compound.js",
    "url": "https://compound.finance/",
    "description": "Compound is an algorithmic, autonomous interest rate protocol built for developers, to unlock a universe of open financial applications.",
    "logo": "https://icons.llama.fi/compound finance.jpg",
    "gecko_id": "compound-governance-token",
    "cmcId": "5692",
    "chains": [],
    "twitter": "compoundfinance",
    "governanceID": [
      "snapshot:comp-vote.eth",
      "eip155:1:0xc0Da02939E1441F497fd74F78cE7Decb17B66529",
      "compound:ethereum:0xc0da01a04c3f3e0be433606045bb7017a7323e38",
      "compound:ethereum:0x336505ec1bcc1a020eede459f57581725d23465a"
    ],
    "github": [
      "compound-finance"
    ]
  },
  {
    "id": "parent#algofi",
    "name": "Algofi",
    "url": "https://www.algofi.org/",
    "description": "Algofi is the DeFi hub built on Algorand. Earn interest, borrow, swap and more on the Algofi lending protocol, DEX, and stablecoin. Further, access liquidity against your governance ALGOs through the Algofi Vault.",
    "logo": "https://icons.llama.fi/algofi.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "algofiorg",
    "github": [
      "Algofiorg"
    ]
  },
  {
    "id": "parent#redacted",
    "name": "Dinero",
    "url": "https://dinero.xyz/",
    "description": "Dinero is a suite of DeFi products that scale yield for protocols and users",
    "logo": "https://icons.llama.fi/dinero.jpg",
    "gecko_id": "dinero-2",
    "cmcId": null,
    "chains": [],
    "twitter": "dinero_xyz",
    "governanceID": [
      "snapshot:redactedcartel.eth"
    ],
    "github": [
      "redacted-cartel",
      "dinero-protocol"
    ],
    "treasury": "redacted.js"
  },
  {
    "id": "parent#tomb-finance",
    "name": "Tomb Finance",
    "url": "https://tomb.finance/",
    "description": "home to the first algorithmic token pegged to $FTM on the Fantom Opera network",
    "logo": "https://icons.llama.fi/tomb-finance.jpg",
    "gecko_id": "tomb",
    "cmcId": "11495",
    "chains": [],
    "twitter": "tombfinance",
    "governanceID": [
      "snapshot:tombfinance.eth"
    ],
    "github": [
      "tombfinance"
    ]
  },
  {
    "id": "parent#volt-finance",
    "name": "Volt Finance",
    "url": "https://voltswap.finance",
    "description": "VoltSwap is the first major DEX in the Meter ecosystem",
    "logo": "https://icons.llama.fi/volt finance.png",
    "gecko_id": "voltswap",
    "cmcId": "19160",
    "chains": [],
    "twitter": "Meter_IO",
    "github": [
      "meterio"
    ],
    "governanceID": [
      "snapshot:voltswap.eth"
    ]
  },
  {
    "id": "parent#based-finance",
    "name": "Based Finance",
    "url": "https://next-gen.basedfinance.io/",
    "description": "An innovative fork of tomb.finance, pegged to the price of 1 TOMB via seigniorage.",
    "logo": "https://icons.llama.fi/based finance.png",
    "gecko_id": "based-finance",
    "cmcId": "17954",
    "chains": [],
    "twitter": "BasedDEFI"
  },
  {
    "id": "parent#ribbon-finance",
    "name": "Ribbon Finance",
    "url": "https://www.ribbon.finance/",
    "description": "Structured products protocol",
    "logo": "https://icons.llama.fi/ribbon-finance.png",
    "gecko_id": "ribbon-finance",
    "cmcId": "12387",
    "chains": [],
    "twitter": "ribbonfinance",
    "treasury": "ribbon.js",
    "governanceID": [
      "snapshot:rbn.eth",
      "snapshot:gauge.rbn.eth"
    ],
    "github": [
      "ribbon-finance"
    ]
  },
  {
    "id": "parent#planet",
    "name": "Planet",
    "url": "https://app.planet.finance/",
    "description": "Planet is a decentralized financial protocol consisting of different planets, each their own application, designed to enable anyone to freely activate their capital.",
    "logo": "https://icons.llama.fi/planet.png",
    "gecko_id": "planet-finance",
    "cmcId": "10023",
    "chains": [],
    "twitter": "planet_finance",
    "governanceID": [
      "snapshot:planetfinance.eth"
    ],
    "github": [
      "planetfinance"
    ]
  },
  {
    "id": "parent#dao-maker",
    "name": "DAO Maker",
    "url": "https://daomaker.com/",
    "description": "DAO Maker creates growth technologies and funding frameworks for startups, while simultaneously reducing risks for investors.",
    "logo": "https://icons.llama.fi/dao-maker.jpg",
    "gecko_id": "dao-maker",
    "cmcId": "8420",
    "chains": [],
    "twitter": "daomaker",
    "governanceID": [
      "snapshot:shomustgoon.eth"
    ],
    "github": [
      "daomaker"
    ]
  },
  {
    "id": "parent#morpho",
    "name": "Morpho",
    "url": "https://morpho.org/",
    "description": "Morpho is an on-chain peer-to-peer layer on top of lending pools. Rates are seamlessly improved for borrowers and lenders while preserving the same guarantees.",
    "logo": "https://icons.llama.fi/morpho.png",
    "gecko_id": "morpho",
    "cmcId": null,
    "chains": [],
    "twitter": "MorphoLabs",
    "governanceID": [
      "snapshot:morpho.eth"
    ],
    "github": [
      "morpho-org"
    ]
  },
  {
    "id": "parent#quickswap",
    "name": "Quickswap",
    "url": "https://quickswap.exchange",
    "description": "QuickSwap is a next-gen DEX and Lending for DeFi.",
    "logo": "https://icons.llama.fi/quickswap.jpg",
    "gecko_id": "quickswap",
    "cmcId": "19966",
    "chains": [],
    "twitter": "QuickswapDEX",
    "governanceID": [
      "snapshot:quickvote.eth"
    ],
    "github": [
      "QuickSwap"
    ]
  },
  {
    "id": "parent#izumi-finance",
    "name": "iZUMi Finance",
    "url": "https://izumi.finance/home",
    "description": "Liquidity Redefined - A multi-chain DeFi protocol providing One-Stop Liquidity as a Service (LaaS).",
    "logo": "https://icons.llama.fi/izumi finance.png",
    "gecko_id": "izumi-finance",
    "cmcId": "16305",
    "chains": [],
    "twitter": "izumi_Finance",
    "governanceID": [
      "snapshot:veizi.eth"
    ],
    "github": [
      "izumiFinance"
    ]
  },
  {
    "id": "parent#temple-dao",
    "name": "Temple DAO",
    "url": "https://www.templedao.link",
    "description": "The TempleDAO protocol aims to provide DeFi users with a safe haven where they can be sheltered from crypto market volatility while benefiting from a set of investment opportunities offering high yields and steady price appreciation",
    "logo": "https://icons.llama.fi/temple-dao.png",
    "gecko_id": "temple",
    "cmcId": "16052",
    "chains": [],
    "twitter": "templedao",
    "github": [
      "TempleDAO"
    ]
  },
  {
    "id": "parent#trader-joe",
    "name": "LFJ",
    "url": "https://lfj.gg/",
    "description": "Let's F***ing Joe is your one-stop decentralized trading platform",
    "logo": "https://icons.llama.fi/trader-joe.png",
    "gecko_id": "joe",
    "cmcId": "11396",
    "chains": [],
    "twitter": "LFJ_gg",
    "treasury": "traderjoe.js",
    "governanceID": [
      "snapshot:joegovernance.eth"
    ],
    "github": [
      "traderjoe-xyz"
    ]
  },
  {
    "id": "parent#handle-finance",
    "name": "handle finance",
    "url": "https://handle.fi",
    "description": "the global defi FX protocol. borrow, convert & trade multi-currency #stablecoins.",
    "logo": "https://icons.llama.fi/handle finance.jpg",
    "gecko_id": "handle-fi",
    "cmcId": "11794",
    "chains": [],
    "twitter": "handle_fi",
    "treasury": "handlefi.js",
    "governanceID": [
      "snapshot:handlefx.eth"
    ],
    "github": [
      "handle-fi"
    ]
  },
  {
    "id": "parent#omnidex",
    "name": "Omnidex",
    "url": "https://omnidex.finance",
    "description": "OmniDex is building a comprehensive decentralized trading platform on the Telos Blockchain.",
    "logo": "https://icons.llama.fi/omnidex.jpg",
    "gecko_id": "omnidex",
    "cmcId": null,
    "chains": [],
    "twitter": "OmniDex1",
    "github": [
      "OmniDexFinance"
    ]
  },
  {
    "id": "parent#amulet",
    "name": "Amulet",
    "url": "https://amulet.org",
    "description": "Amulet was born to make earning in the Web3 world safe and simple. Our goal is clear: to combine yield and protection for every crypto user globally. We envision a space where safe yields are the norm. Our mission is to build a user-friendly Web3 platform that empowers everyone to earn securely. Rooted in user-focused, trust, security, and innovation, our brand values guide our commitment. Amulet is more than a platform; it's a safe space where users of all levels can confidently earn in a protected environment.",
    "logo": "https://icons.llama.fi/amulet.jpg",
    "gecko_id": "amulet-protocol",
    "cmcId": "29185",
    "chains": [],
    "twitter": "AmuletProtocol",
    "github": [
      "Amulet-Protocol"
    ]
  },
  {
    "id": "parent#uniswap",
    "name": "Uniswap",
    "url": "https://uniswap.org/",
    "description": "Swap, earn, and build on the leading decentralized crypto trading protocol.",
    "logo": "https://icons.llama.fi/uniswap.png",
    "gecko_id": "uniswap",
    "cmcId": "7083",
    "chains": [],
    "twitter": "Uniswap",
    "treasury": "uniswap.js",
    "governanceID": [
      "snapshot:uniswap",
      "eip155:1:0x408ED6354d4973f66138C91495F2f2FCbd8724C3",
      "compound:ethereum:0x5e4be8bc9637f0eaa1a755019e06a68ce081d58f"
    ],
    "github": [
      "Uniswap"
    ]
  },
  {
    "id": "parent#tetu",
    "name": "Tetu",
    "url": "http://tetu.io",
    "description": "Tetu is a decentralized organization committed to providing a next generation yield aggregator to DeFi investors. The Tetu core team has deep industry knowledge building back-end international banking systems and development with leading global payment processing infrastructure.",
    "logo": "https://icons.llama.fi/tetu.svg",
    "gecko_id": "tetu",
    "cmcId": "12452",
    "chains": [],
    "twitter": "tetu_io",
    "governanceID": [
      "snapshot:tetu.eth"
    ],
    "github": [
      "tetu-io"
    ]
  },
  {
    "id": "parent#pando",
    "name": "Pando",
    "url": "https://pando.im",
    "description": "Pando is a set of open financial protocols which includes 3 major protocols: 1.Pando Lake/4swap: a decentralized protocol for automated liquidity provision built with the Mixin Trusted Group. 2.Pando Leaf: a decentralized financial network to minting stablecoins. 3.Pando Rings: a decentralized protocol where you can lend or borrow cryptocurrencies",
    "logo": "https://icons.llama.fi/pando.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "pando_im",
    "github": [
      "pandodao"
    ]
  },
  {
    "id": "parent#meteora",
    "name": "Meteora",
    "url": "https://meteora.ag/",
    "description": "Building the most secure, sustainable & composable yield layer for all of Solana and DeFi",
    "logo": "https://icons.llama.fi/meteora.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "MeteoraAG",
    "github": [
      "mercurial-finance"
    ]
  },
  {
    "id": "parent#folks-finance",
    "name": "Folks Finance",
    "url": "https://folks.finance/",
    "description": "Innovative DeFi platform to lend, borrow, trade and manage digital assets.",
    "logo": "https://icons.llama.fi/folks-finance.jpg",
    "gecko_id": "xalgo",
    "cmcId": null,
    "chains": [],
    "twitter": "FolksFinance",
    "github": [
      "Folks-Finance"
    ]
  },
  {
    "id": "parent#yield-yak",
    "name": "Yield Yak",
    "url": "https://yieldyak.com",
    "description": "Yield Yak provides tools for DeFi users on Avalanche. Discover a huge selection of autocompounding farms and make your life easier.",
    "logo": "https://icons.llama.fi/yield yak.png",
    "gecko_id": "yield-yak",
    "cmcId": "11415",
    "chains": [],
    "twitter": "yieldyak_",
    "governanceID": [
      "snapshot:yakherd.eth"
    ],
    "github": [
      "yieldyak"
    ]
  },
  {
    "id": "parent#animal-farm",
    "name": "Animal Farm",
    "url": "https://animalfarm.app",
    "description": "Our vision is to make traditional finance tools, typically only reserved for the super wealthy, available to the anyone by using decentralized protocols which are not limited by the gatekeeping of centralized institutions. All of our products utilize trustless models that allow users to take full ownership of their personal finances. Lending and yield aggregating is the main focus of Animal Farm, but unlike other platforms Animal Farm is the only true decentralized ownership lending and yield aggregating platform.",
    "logo": "https://icons.llama.fi/animal farm.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "DRIPcommunity",
    "governanceID": [
      "snapshot:theanimalfarm.eth"
    ]
  },
  {
    "id": "parent#metavault",
    "name": "Metavault",
    "url": "https://metavault.trade/",
    "description": "Metavault is a blockchain-based, community governed investment platform and decentralized venture capital fund. It allows anyone to participate in the latest and most profitable DeFi projects and strategies and deploys a in-house development team for project incubation.",
    "logo": "https://icons.llama.fi/metavault.jpg",
    "gecko_id": "metavault-dao",
    "cmcId": null,
    "chains": [],
    "twitter": "MetavaultDAO",
    "governanceID": [
      "snapshot:metavault-trade.eth",
      "snapshot:metavault-dao.eth"
    ],
    "github": [
      "metavaultorg"
    ]
  },
  {
    "id": "parent#woofi",
    "name": "WOOFi",
    "url": "https://fi.woo.org",
    "description": "One DEX to rule all chains  - trade and earn like royalty with unmatched execution, cross-chain swaps, and single-sided yields.",
    "logo": "https://icons.llama.fi/woofi.png",
    "gecko_id": "woo-network",
    "cmcId": "7501",
    "chains": [],
    "treasury": "woofi.js",
    "twitter": "_WOOFi",
    "github": [
      "woonetwork"
    ]
  },
  {
    "id": "parent#revert",
    "name": "Revert",
    "url": "https://revert.finance",
    "description": "Actionable analytics for AMM liquidity providers.",
    "logo": "https://icons.llama.fi/revert.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "revertfinance",
    "github": [
      "revert-finance"
    ]
  },
  {
    "id": "parent#polycat-finance",
    "name": "Polycat Finance",
    "url": "https://polycat.finance",
    "description": "Polycat is a decentralized hybrid yield optimizer (yield farm and yield aggregator) running on the Polygon blockchain (formerly known as MATIC). The Paw token is the second token in their ecosystem that they introduced with the launch of their AMM.",
    "logo": "https://icons.llama.fi/polycat finance.jpg",
    "gecko_id": "polycat-finance",
    "cmcId": "10134",
    "chains": [],
    "twitter": "PolycatFinance",
    "governanceID": [
      "snapshot:polycatfi.eth"
    ],
    "github": [
      "polycatfi"
    ]
  },
  {
    "id": "parent#mstable",
    "name": "mStable",
    "url": "https://mstable.org/",
    "description": "mStable unites stablecoins, lending and swapping into one standard.",
    "logo": "https://icons.llama.fi/mstable.png",
    "gecko_id": "meta",
    "cmcId": "5748",
    "chains": [],
    "twitter": "mstable_",
    "treasury": "mstable.js",
    "governanceID": [
      "snapshot:mstablegovernance.eth"
    ],
    "stablecoins": [
      "mstable-usd"
    ],
    "github": [
      "mstable"
    ]
  },
  {
    "id": "parent#realt",
    "name": "RealT",
    "url": "https://realt.co",
    "description": "RealToken provides investors with a method to buy into fractional, tokenized properties, leveraging the U.S. legal system and the permissionless, unrestricted token issuance of Ethereum",
    "logo": "https://icons.llama.fi/realt.png",
    "gecko_id": "realtoken-ecosystem-governance",
    "cmcId": null,
    "github": [
      "real-token"
    ],
    "chains": [],
    "twitter": "RealTPlatform"
  },
  {
    "id": "parent#neopin",
    "name": "NEOPIN",
    "url": "https://neopin.io",
    "description": "NEOPIN is a one-stop, non-custodial CeDeFi protocol for the secure use of crypto with regulatory frameworks while leveraging the benefits of both CeFi and DeFi.",
    "logo": "https://icons.llama.fi/neopin.png",
    "gecko_id": "neopin",
    "cmcId": "18966",
    "chains": [],
    "twitter": "NeopinOfficial",
    "github": [
      "Neopin"
    ]
  },
  {
    "id": "parent#sperax",
    "name": "Sperax",
    "url": "http://sperax.io",
    "description": "SperaxUSD (USDs) is a stablecoin and yield-automator on Arbitrum. USDs is 100% backed by collateral that is sent to DeFi strategies to produce a yield. This yield is then distributed to holders in a gasless manner, making compound interest easy",
    "logo": "https://icons.llama.fi/sperax.png",
    "gecko_id": "sperax",
    "cmcId": "6715",
    "chains": [],
    "twitter": "SperaxUSD",
    "governanceID": [
      "snapshot:speraxdao.eth"
    ],
    "stablecoins": [
      "sperax-usd"
    ],
    "github": [
      "Sperax"
    ]
  },
  {
    "id": "parent#opyn",
    "name": "Opyn",
    "url": "https://www.opyn.co",
    "description": "Opyn is building Defi-native derivatives and options infrastructure in DeFi",
    "logo": "https://icons.llama.fi/opyn.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "opyn_",
    "github": [
      "opynfinance"
    ]
  },
  {
    "id": "parent#nest-protocol",
    "name": "NEST Protocol",
    "url": "https://nestprotocol.org",
    "description": "The NEST oracle solves the problem of price on-chain through a decentralized incentive solution, that is, the price predictor.",
    "logo": "https://icons.llama.fi/nest-protocol.png",
    "gecko_id": "nest",
    "cmcId": "5841",
    "chains": [],
    "twitter": "nest_protocol",
    "governanceID": [
      "snapshot:nestecosystem.eth"
    ],
    "github": [
      "NEST-Protocol"
    ]
  },
  {
    "id": "parent#bao-finance",
    "name": "BAO Finance",
    "url": "https://app.baofinance.io",
    "description": "Bao Finance is a decentralized, community-run project that uses synthetics to move the power of information from institutions to individuals",
    "logo": "https://icons.llama.fi/bao-finance.jpg",
    "gecko_id": "bao-finance-v2",
    "cmcId": null,
    "chains": [],
    "twitter": "BaoCommunity",
    "governanceID": [
      "snapshot:pandaswapbsc.eth",
      "snapshot:baovotes.eth"
    ],
    "stablecoins": [
      "baousd"
    ],
    "github": [
      "baofinance"
    ]
  },
  {
    "id": "parent#uniwswap",
    "name": "UniWswap",
    "url": "https://uniwswap.com/",
    "description": "UniWswap is an AMM and Farm on EthereumPoW",
    "logo": "https://icons.llama.fi/uniwswap.png",
    "gecko_id": "uniwswap",
    "cmcId": null,
    "chains": [],
    "twitter": "uniwswap",
    "github": [
      "uniwswap"
    ]
  },
  {
    "id": "parent#metronome",
    "name": "Metronome",
    "url": "https://www.metronome.io/",
    "description": "Synthesizing the future of DeFi.",
    "logo": "https://icons.llama.fi/metronome.png",
    "gecko_id": "metronome",
    "cmcId": "2873",
    "chains": [],
    "twitter": "MetronomeDAO",
    "treasury": "metronome.js",
    "governanceID": [
      "snapshot:metronome.eth",
      "compound:ethereum:0xc8697de7c190244bfd63d276823aa20035cb5a12"
    ],
    "github": [
      "autonomoussoftware"
    ]
  },
  {
    "id": "parent#paraluni",
    "name": "Paraluni",
    "url": "https://paraluni.org",
    "description": "Paraluni,based on the BSC,a no holding currency, no ICO, no pre-mining decentralized platform.",
    "logo": "https://icons.llama.fi/paraluni.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "paraluni"
  },
  {
    "id": "parent#waterfall-finance",
    "name": "Waterfall Finance",
    "url": "https://lottery.defiwaterfall.com/",
    "description": "An innovative eco-system",
    "logo": "https://icons.llama.fi/waterfall-wtf.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "defi_waterfall",
    "governanceID": [
      "snapshot:waterfalldao.eth"
    ]
  },
  {
    "id": "parent#inverse-finance",
    "name": "Inverse Finance",
    "url": "https://www.inverse.finance",
    "description": "DOLA Borrowing Rights replace interest rates with a fixed fee that can earn you more.",
    "logo": "https://icons.llama.fi/inverse-finance.jpg",
    "gecko_id": "inverse-finance",
    "cmcId": "8720",
    "chains": [],
    "treasury": "inverse.js",
    "governanceID": [
      "eip155:1:0x35d9f4953748b318f18c30634bA299b237eeDfff",
      "compound:ethereum:0xBeCCB6bb0aa4ab551966A7E4B97cec74bb359Bf6"
    ],
    "twitter": "InverseFinance",
    "stablecoins": [
      "dola"
    ],
    "github": [
      "InverseFinance"
    ]
  },
  {
    "id": "parent#kujira-protocol",
    "name": "Kujira Protocol",
    "url": "https://kujira.app",
    "description": "A decentralized ecosystem for protocols, builders and web3 users seeking sustainable FinTech.",
    "logo": "https://icons.llama.fi/kujira-protocol.png",
    "gecko_id": "kujira",
    "cmcId": "15185",
    "chains": [],
    "twitter": "TeamKujira",
    "stablecoins": [
      "usk"
    ],
    "github": [
      "Team-Kujira"
    ]
  },
  {
    "id": "parent#steakhut-finance",
    "name": "Steakhut Finance",
    "url": "https://www.steakhut.finance",
    "description": "Discover endless DeFi opportunities, join the liquidity layer of Avalanche.",
    "logo": "https://icons.llama.fi/steakhut-finance.png",
    "gecko_id": "steakhut-finance",
    "cmcId": "20266",
    "chains": [],
    "twitter": "steakhut_fi"
  },
  {
    "id": "parent#mahadao",
    "name": "MahaDAO",
    "url": "https://mahadao.com",
    "description": "MahaDAO is a community focused DAO focused on building ARTH, a decentralized valuecoin that maintains the purchasing power of it's token. It is designed to appreciate against the US dollar (after accounting for inflation) in the long run whilst remaining relatively stable in the short run.",
    "logo": "https://icons.llama.fi/mahadao.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "TheMahaDAO",
    "treasury": "mahadao.js",
    "governanceID": [
      "snapshot:maha.eth"
    ],
    "github": [
      "MahaDAO"
    ]
  },
  {
    "id": "parent#tethys-finance",
    "name": "Tethys Finance",
    "url": "https://tethys.finance",
    "description": "We believe that in the future, L2 solutions will help Ethereum with scaling. Our mission is to empower the Metis Andromeda network with a fast, secure, reliable, and advanced native decentralized exchange app to handle all kinds of trading needs.",
    "logo": "https://icons.llama.fi/tethys-finance.png",
    "gecko_id": "tethys-finance",
    "cmcId": "16640",
    "chains": [],
    "twitter": "tethysfinance",
    "governanceID": [
      "snapshot:tethysswap.eth"
    ]
  },
  {
    "id": "parent#timeless",
    "name": "Timeless",
    "url": "https://timelessfi.com",
    "description": "Timeless is powered by yield tokens, specially designed ERC-20 tokens whose values are related to yield rates. Each farm corresponds to a set of three yield tokens.",
    "logo": "https://icons.llama.fi/timeless.jpg",
    "gecko_id": "timeless",
    "cmcId": "23236",
    "chains": [],
    "twitter": "Timeless_Fi",
    "governanceID": [
      "snapshot:timelessfi.eth"
    ],
    "github": [
      "timeless-fi"
    ]
  },
  {
    "id": "parent#cap-finance",
    "name": "Cap Finance",
    "url": "https://www.cap.io",
    "description": "Decentralized Perps. Trade with up to 100x leverage directly from your wallet. ",
    "logo": "https://icons.llama.fi/cap-finance.jpg",
    "gecko_id": "cap",
    "treasury": "cap.js",
    "cmcId": "5809",
    "chains": [],
    "twitter": "CapDotFinance",
    "github": [
      "capofficial"
    ]
  },
  {
    "id": "parent#sphere",
    "name": "SPHERE",
    "url": "https://www.sphere.finance",
    "description": "The center of DeFi - earn revenue from multiple innovative streams by holding one token.",
    "logo": "https://icons.llama.fi/sphere.jpg",
    "gecko_id": "sphere-finance",
    "cmcId": "18945",
    "chains": [],
    "twitter": "SphereDeFi",
    "governanceID": [
      "snapshot:spherefinance.eth"
    ]
  },
  {
    "id": "parent#pancakeswap",
    "name": "PancakeSwap",
    "url": "https://pancakeswap.finance",
    "description": "Trade. Earn. Win. NFT.",
    "logo": "https://icons.llama.fi/pancakeswap.jpg",
    "gecko_id": "pancakeswap-token",
    "cmcId": "7186",
    "chains": [],
    "twitter": "PancakeSwap",
    "governanceID": [
      "snapshot:cakevote.eth"
    ],
    "github": [
      "pancakeswap"
    ]
  },
  {
    "id": "parent#zyberswap",
    "name": "ZyberSwap",
    "url": "https://www.zyberswap.io",
    "description": "Zyberswap is one of the first decentralized exchanges (DEX) with an automated market-maker (AMM) on the Arbitrum blockchain. ",
    "logo": "https://icons.llama.fi/zyberswap.jpg",
    "gecko_id": "zyberswap",
    "cmcId": "23419",
    "chains": [],
    "twitter": "zyberswap",
    "treasury": "zyber-swap.js",
    "governanceID": [
      "snapshot:zyberswap.eth"
    ]
  },
  {
    "id": "parent#scrub-money",
    "name": "Scrub Money",
    "url": "https://scrub.money",
    "description": "Decentralized commerce and services ecosystem",
    "logo": "https://icons.llama.fi/scrub-money.png",
    "gecko_id": "lion-scrub-finance",
    "cmcId": "19410",
    "chains": [],
    "twitter": "ScrubFinance"
  },
  {
    "id": "parent#bank-of-cronos",
    "name": "Bank Of Cronos",
    "url": "https://boc.bankofcronos.com",
    "description": "BOC is a community-owned decentralized autonomous organization introducing DeFi protocols on the Cronos network. DeFi Simplified, on Cronos.",
    "logo": "https://icons.llama.fi/bank-of-cronos.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "bankofcronos",
    "treasury": "bankofcronos.js"
  },
  {
    "id": "parent#benddao",
    "name": "BendDAO",
    "url": "https://www.benddao.xyz",
    "description": "Use your NFTs as collateral to borrow ETH or deposit your ETH and earn yields instantly.",
    "logo": "https://icons.llama.fi/benddao.png",
    "gecko_id": "benddao",
    "cmcId": "19162",
    "chains": [],
    "twitter": "BendDAO",
    "treasury": "benddao.js",
    "governanceID": [
      "snapshot:benddao.eth"
    ],
    "github": [
      "BendDAO"
    ]
  },
  {
    "id": "parent#subzero",
    "name": "Subzero",
    "url": "https://subzero.plus",
    "description": "Subzero is a decentralized venture capital investment protocol on the Avalanche network. The protocol focuses on sustainable mechanisms to encourage long-term staking and providing liquidity.",
    "logo": "https://icons.llama.fi/subzero.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "subzeroplus"
  },
  {
    "id": "parent#diamond",
    "name": "Diamond Protocol",
    "url": "https://dmo.finance",
    "description": "Diamond Protocol aims to be the DeFi Lab to build on-chain structured products to earn sustainable yield on crypto assets.",
    "logo": "https://icons.llama.fi/diamond-protocol.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "DiamondProtocol"
  },
  {
    "id": "parent#lif3.com",
    "name": "Lif3.com",
    "url": "https://lif3.com/",
    "description": "Lif3.com is a complete multi-chain DeFi Ecosystem",
    "logo": "https://icons.llama.fi/lif3.com.png",
    "gecko_id": "lif3",
    "cmcId": "20611",
    "chains": [],
    "twitter": "Official_LIF3"
  },
  {
    "id": "parent#timeswap",
    "name": "Timeswap",
    "url": "https://timeswap.io",
    "description": "Timeswap is the first oracleless lending/borrowing protocol. Timeswap enables the creation of money markets for ANY ERC-20 tokens",
    "logo": "https://icons.llama.fi/timeswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "TimeswapLabs",
    "github": [
      "Timeswap-Labs"
    ]
  },
  {
    "id": "parent#beamswap",
    "name": "BeamSwap",
    "url": "https://beamswap.io",
    "description": "Defi Hub on Moonbeam",
    "logo": "https://icons.llama.fi/beamswap.jpg",
    "gecko_id": "beamswap",
    "cmcId": "17035",
    "chains": [],
    "twitter": "Beamswapio",
    "github": [
      "BeamSwap"
    ]
  },
  {
    "id": "parent#surfswap",
    "name": "Surfswap",
    "url": "https://surfdex.io/",
    "description": "Community DEX on Kava. One-stop shop for the crypto community, enabling peer-to-peer transactions.",
    "logo": "https://icons.llama.fi/surfswap.jpg",
    "gecko_id": "surfswap",
    "cmcId": null,
    "chains": [],
    "twitter": "SurfswapDEX"
  },
  {
    "id": "parent#balancer",
    "name": "Balancer",
    "url": "https://balancer.fi",
    "description": "Balancer is a decentralized automated market maker (AMM) protocol built on Ethereum that represents a flexible building block for programmable liquidity.",
    "logo": "https://icons.llama.fi/balancer.png",
    "gecko_id": "balancer",
    "cmcId": "5728",
    "chains": [],
    "twitter": "Balancer",
    "governanceID": [
      "snapshot:balancer.eth"
    ],
    "treasury": "balancer.js",
    "github": [
      "balancer"
    ]
  },
  {
    "id": "parent#kyberswap",
    "name": "KyberSwap",
    "url": "https://kyberswap.com",
    "description": "Multichain DEX & aggregator on 14 chains. KyberSwap is both a decentralized exchange (DEX) aggregator and a liquidity source with capital-efficient liquidity pools that earns fees for liquidity providers.",
    "logo": "https://icons.llama.fi/kyberswap.png",
    "gecko_id": "kyber-network-crystal",
    "cmcId": "9444",
    "chains": [],
    "twitter": "KyberNetwork",
    "treasury": "kyber.js",
    "github": [
      "KyberNetwork"
    ]
  },
  {
    "id": "parent#opensea",
    "name": "OpenSea",
    "url": "https://opensea.io/",
    "description": "OpenSea is the world's first and largest web3 marketplace for NFTs and crypto collectibles.",
    "logo": "https://icons.llama.fi/opensea.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "opensea"
  },
  {
    "id": "parent#ruby.exchange",
    "name": "Ruby.Exchange",
    "url": "https://ruby.exchange",
    "description": "Gasless, NFT-powered AMM/Dual DEX on the SKALE Network",
    "logo": "https://icons.llama.fi/ruby.exchange.jpg",
    "gecko_id": "ruby",
    "cmcId": null,
    "chains": [],
    "twitter": "ruby_exchange",
    "github": [
      "RubyExchange"
    ]
  },
  {
    "id": "parent#skullswap",
    "name": "SkullSwap",
    "url": "https://www.skullswap.exchange",
    "description": "SkullSwap is an automated market-making (AMM) decentralized exchange (DEX) for the Fantom Opera network. ",
    "logo": "https://icons.llama.fi/skullswap.png",
    "gecko_id": "skullswap-exchange",
    "cmcId": null,
    "chains": [],
    "twitter": "skullswapdex"
  },
  {
    "id": "parent#rocifi",
    "name": "RociFi",
    "url": "https://roci.fi",
    "description": "RociFi - On-chain Credit Scoring and Capital-Efficient Lending Protocol",
    "logo": "https://icons.llama.fi/rocifi.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "rocifi",
    "github": [
      "RociFi"
    ]
  },
  {
    "id": "parent#lfgswap",
    "name": "LFGSwap",
    "url": "https://app.lfgswap.finance/swap",
    "description": "AMM DEX on EthereumPoW and CORE blockchain",
    "logo": "https://icons.llama.fi/lfgswap.png",
    "gecko_id": "lfgswap-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "LfgSwap",
    "github": [
      "LfgSwap"
    ]
  },
  {
    "id": "parent#oswap",
    "name": "Oswap",
    "url": "https://oswap.io",
    "description": "A fully decentralized protocol for automated liquidity provision on Obyte.",
    "logo": "https://icons.llama.fi/oswap.jpg",
    "gecko_id": "byteball",
    "cmcId": "1492",
    "chains": [],
    "twitter": "ObyteOrg"
  },
  {
    "id": "parent#parax",
    "name": "Parallel Super App",
    "url": "https://parax.ai",
    "description": "The Parallel Super App, deployed on the universal Layer 2 solution, Parallel, stands as an integrated platform merging Parallel Finance and ParaX products into a user-centric space. Offering a comprehensive range of DeFi functionalities spanning yield generation, lending, staking, trading, and more across diverse blockchain networks, the app confronts existing DeFi challenges. Leveraging Parallel's versatile Layer 2 infrastructure, it delivers benefits like gasless transactions, rapid processing, heightened security, and a seamless DeFi encounter. As an all-in-one solution, the app enables cross-margin NFT lending, staking, trading, and user-friendly features within its interface",
    "logo": "https://icons.llama.fi/parallel-super-app.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ParallelFi",
    "github": [
      "para-space"
    ]
  },
  {
    "id": "parent#alpaca-finance",
    "name": "Alpaca Finance",
    "url": "https://www.alpacafinance.org",
    "description": "Alpaca Finance is the largest lending protocol allowing leveraged yield farming on BNB Chain and Fantom. It helps lenders earn safe and stable yields, and offers borrowers undercollateralized loans for leveraged yield farming positions, vastly multiplying their farming principals and resulting profits.",
    "logo": "https://icons.llama.fi/alpaca-finance.png",
    "gecko_id": "alpaca-finance",
    "cmcId": "8707",
    "chains": [],
    "twitter": "AlpacaFinance",
    "governanceID": [
      "snapshot:alpacafinance.eth"
    ],
    "github": [
      "alpaca-finance"
    ]
  },
  {
    "id": "parent#spin",
    "name": "Spin",
    "url": "https://spin.fi",
    "description": "Spin is a 360° decentralized trading and investments platform built on NEAR Protocol. Spin offers a wide range of products designed to meet the demands of both novice and savvy traders, DeFi investors, and passive income seekers.",
    "logo": "https://icons.llama.fi/spin.png",
    "gecko_id": "spin-fi",
    "cmcId": null,
    "chains": [],
    "twitter": "spin_fi",
    "github": [
      "spin-fi"
    ]
  },
  {
    "id": "parent#arrakis-finance",
    "name": "Arrakis Finance",
    "url": "https://www.arrakis.finance",
    "description": "Arrakis is web3's trustless market making infrastructure protocol that enables running sophisticated algorithmic strategies on Uniswap V3. Liquidity providers can utilize Arrakis Vaults to have their liquidity be managed in an automated, capital efficient, non-custodial and transparent manner. ",
    "logo": "https://icons.llama.fi/arrakis-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ArrakisFinance",
    "github": [
      "ArrakisFinance"
    ]
  },
  {
    "id": "parent#enosys",
    "name": "Enosys",
    "url": "https://enosys.global",
    "description": "Formerly FLR Finance. Building a Multi-Chain DeFi Economy. From the creators of @FlareScan and @DeFiOracles",
    "logo": "https://icons.llama.fi/enosys.jpg",
    "gecko_id": "flare-finance",
    "cmcId": "16929",
    "chains": [],
    "twitter": "enosys_global",
    "github": [
      "flrfinance"
    ]
  },
  {
    "id": "parent#velocimeter",
    "name": "Velocimeter",
    "url": "https://canto.velocimeter.xyz/",
    "description": "Velocimeter's twin-AMM design unites StableSwap pools with Standard 'kxy' liquidity pools. All the trading fees go to Vote-Escrowers of emission token $FLOW which has to be Locked to earn triple 'Bribes' from candidate pools via Trade Fee, Internal Bribes & External Bribes",
    "logo": "https://icons.llama.fi/velocimeter.png",
    "gecko_id": "fantom-velocimeter",
    "cmcId": null,
    "chains": [],
    "twitter": "VelocimeterDEX",
    "github": [
      "Velocimeter"
    ]
  },
  {
    "id": "parent#kleva-protocol",
    "name": "Kleva Protocol",
    "url": "https://kleva.io",
    "description": "KLEVA Protocol is the first Leveraged Yield Farming Protocol on KLAYTN, with aim to become the largest Lending Protocol for Leveraged Yield Farmers and Lenders.",
    "logo": "https://icons.llama.fi/kleva-protocol.png",
    "gecko_id": "kleva",
    "cmcId": "21122",
    "chains": [],
    "github": [
      "kleva-protocol"
    ],
    "twitter": "KLEVA_Protocol"
  },
  {
    "id": "parent#wynd",
    "name": "WYND",
    "url": "https://app.wynddao.com",
    "description": "WYND is a new ReFi protocol to leverage DeFi tokenomics to regenerate the environment.",
    "logo": "https://icons.llama.fi/wynd.jpg",
    "gecko_id": "wynd",
    "cmcId": null,
    "chains": [],
    "twitter": "wynddao"
  },
  {
    "id": "parent#overnight-finance",
    "name": "Overnight Finance",
    "symbol": "OVN",
    "url": "https://overnight.fi",
    "description": "Overnight Finance is an asset management protocol offering passive yield products based on delta-neutral strategies, primarily for conservative stablecoin investors.",
    "logo": "https://icons.llama.fi/overnight-finance.jpg",
    "gecko_id": "overnight-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "overnight_fi",
    "github": [
      "ovnstable"
    ]
  },
  {
    "id": "parent#fairyswap",
    "name": "FairySwap",
    "url": "https://fairyswap.finance",
    "description": "The first DAPP on Findora, offering unparalleled privacy and security with zero-knowledge technology.",
    "logo": "https://icons.llama.fi/fairyswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "fairy_swap",
    "github": [
      "Fairyswap"
    ]
  },
  {
    "id": "parent#wemix.fi",
    "name": "WEMIX.FI",
    "url": "https://wemix.fi",
    "description": "WEMIX.Fi is the first decentralized exchange on the WEMIX3.0 mainnet. WEMIX.Fi is a fully on-chain DeFi platform supporting storage, exchange, borrowing, settlement and investment of crypto-assets.",
    "logo": "https://icons.llama.fi/wemix.fi.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "WemixNetwork",
    "github": [
      "wemixarchive"
    ]
  },
  {
    "id": "parent#radiant",
    "name": "Radiant",
    "url": "https://radiant.capital/#/markets",
    "description": "Earn Interest & Borrow Assets Cross-Chain, Seamlessly",
    "logo": "https://icons.llama.fi/radiant.png",
    "gecko_id": "radiant-capital",
    "cmcId": "21106",
    "chains": [],
    "twitter": "RDNTCapital",
    "governanceID": [
      "snapshot:radiantcapital.eth"
    ],
    "github": [
      "radiant-capital"
    ]
  },
  {
    "id": "parent#puzzleswaporg",
    "name": "PuzzleSwapOrg",
    "url": "https://puzzleswap.org/trade",
    "description": "DEX 2.0 & Lending protocol built on Waves to bring a new light to DeFi experience",
    "logo": "https://icons.llama.fi/puzzle-swap.jpg",
    "gecko_id": "puzzle-swap",
    "cmcId": null,
    "chains": [],
    "twitter": "puzzle_swap"
  },
  {
    "id": "parent#covo-finance",
    "name": "Covo Finance",
    "url": "https://covo.finance",
    "description": "Covo Finance is a decentralized trading platform that offers spot and perpetual trading with low swap fees and zero market impact. The platform offers a maximum leverage of 50x on major cryptos and is backed by a singular multi-asset pool that generates income for liquidity providers through fees garnered from market making, swap transactions, leveraged trading (including spreads, funding fees, and liquidations), and rebalancing of assets.",
    "logo": "https://icons.llama.fi/covo-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "covofinance"
  },
  {
    "id": "parent#hadouken-finance",
    "name": "Hadouken Finance",
    "url": "https://hadouken.finance/",
    "description": "An integrated borrowing/lending platform and AMM on Godwoken V1 Network.",
    "logo": "https://icons.llama.fi/hadouken-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "HadoukenFinance"
  },
  {
    "id": "parent#synthetix",
    "name": "Synthetix",
    "url": "https://synthetix.io",
    "description": "Synthetix is a derivatives liquidity protocol providing the backbone for derivatives trading in DeFi.",
    "logo": "https://icons.llama.fi/synthetix.png",
    "gecko_id": "havven",
    "cmcId": "2586",
    "chains": [],
    "twitter": "synthetix_io",
    "governanceID": [
      "snapshot:synthetix-stakers-poll.eth"
    ],
    "stablecoins": [
      "susd",
      "seur"
    ],
    "github": [
      "Synthetixio"
    ],
    "treasury": "synthetix.js"
  },
  {
    "id": "parent#starfish",
    "name": "Starfish",
    "url": "https://app.starfish.finance",
    "description": "Leading the Entertainment-Fi experience in Web3",
    "logo": "https://icons.llama.fi/starfish.jpg",
    "gecko_id": "starfish-finance",
    "cmcId": "22002",
    "chains": [],
    "twitter": "Starfish_Fi"
  },
  {
    "id": "parent#hector-network",
    "name": "Hector Network",
    "url": "https://hector.network",
    "description": "Hector Network is an expansive decentralized ecosystem run by a utility token, HEC, and complemented by the TOR stablecoin.",
    "logo": "https://icons.llama.fi/hector-network.png",
    "gecko_id": "hector-dao",
    "cmcId": "13881",
    "chains": [],
    "twitter": "Hector_Network",
    "treasury": "hector.js",
    "governanceID": [
      "snapshot:hectordao.eth"
    ],
    "stablecoins": [
      "tor"
    ],
    "github": [
      "Hector-Network"
    ]
  },
  {
    "id": "parent#zenlink",
    "name": "Zenlink",
    "url": "https://zenlink.pro",
    "description": "An ultimate, open, and universal cross-chain DEX protocol for building DEX on Polkadot with one click. Make DEX easier, for more people.",
    "logo": "https://icons.llama.fi/zenlink.png",
    "gecko_id": "zenlink-network-token",
    "cmcId": "15419",
    "chains": [],
    "twitter": "ZenlinkPro",
    "github": [
      "zenlinkpro"
    ]
  },
  {
    "id": "parent#camelot",
    "name": "Camelot",
    "url": "https://camelot.exchange/",
    "description": "Camelot is an ecosystem-focused and community-driven DEX built on Arbitrum. It has been built as a highly efficient and customizable protocol, allowing both builders and users to leverage our custom infrastructure for deep, sustainable, and adaptable liquidity. Camelot moves beyond the traditional design of DEXs to focus on offering a tailored approach that prioritises composability",
    "logo": "https://icons.llama.fi/camelot.png",
    "gecko_id": "camelot-token",
    "cmcId": "22949",
    "chains": [],
    "twitter": "CamelotDEX"
  },
  {
    "id": "parent#thala-labs",
    "name": "Thala",
    "url": "https://www.thala.fi/",
    "description": "Thala is a decentralized finance protocol powered by the Move language, enabling seamless borrowing of a decentralized, over-collateralized stablecoin in Move Dollar and capital-efficient liquidity provisioning via a rebalancing AMM on the Aptos blockchain",
    "logo": "https://icons.llama.fi/thala.png",
    "gecko_id": "thala",
    "cmcId": "24268",
    "chains": [],
    "twitter": "ThalaLabs",
    "github": [
      "ThalaLabs"
    ]
  },
  {
    "id": "parent#stake.link",
    "name": "stake.link",
    "url": "https://stake.link",
    "description": "stake.link is a diversified liquid staking protocol powered by fifteen of the most experienced and reliable infrastructure providers in Web3",
    "logo": "https://icons.llama.fi/stake.link.png",
    "gecko_id": "stake-link",
    "cmcId": "22906",
    "chains": [],
    "twitter": "stakedotlink",
    "governanceID": [
      "snapshot:stakedotlink.eth"
    ],
    "github": [
      "stakedotlink"
    ]
  },
  {
    "id": "parent#dove-swap",
    "name": "Dove Swap",
    "url": "https://swap.dovish.finance",
    "description": "Bringing innovative DeFi to the zkEVM space.",
    "logo": "https://icons.llama.fi/dove-swap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "DovishFi"
  },
  {
    "id": "parent#forge-sx",
    "name": "Forge SX",
    "url": "https://forge.sx",
    "description": "Forge is a brand new DeFi protocol enabling anyone to mint & trade real-world assets with the convenience of the blockchain",
    "logo": "https://icons.llama.fi/forge-sx.jpg",
    "gecko_id": "forge",
    "cmcId": null,
    "chains": [],
    "twitter": "forge_sx",
    "github": [
      "ForgeSx"
    ]
  },
  {
    "id": "parent#juicebox",
    "name": "Juicebox",
    "url": "https://juicebox.money/",
    "description": "Join thousands of projects using Juicebox to fund, operate, and scale their ideas & communities transparently on Ethereum.",
    "logo": "https://icons.llama.fi/juicebox.png",
    "gecko_id": "juicebox",
    "cmcId": "15456",
    "chains": [],
    "twitter": "juiceboxETH",
    "github": [
      "jbx-protocol"
    ]
  },
  {
    "id": "parent#sovryn",
    "name": "Sovryn",
    "url": "https://sovryn.com/",
    "description": "Sovryn is a non-custodial and permission-less smart contract based system for bitcoin lending, borrowing and margin trading.",
    "logo": "https://icons.llama.fi/sovryn.png",
    "gecko_id": "sovryn",
    "cmcId": "8669",
    "chains": [],
    "twitter": "SovrynBTC",
    "governanceID": [
      "compound:rsk:0x6496df39d000478a7a7352c01e0e713835051ccd"
    ],
    "github": [
      "DistributedCollective"
    ]
  },
  {
    "id": "parent#polynomial-protocol",
    "name": "Polynomial Protocol",
    "url": "https://www.polynomial.fi",
    "description": "Polynomial automates financial derivative strategies to create products that deliver passive yield on various assets",
    "logo": "https://icons.llama.fi/polynominal-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "PolynomialFi"
  },
  {
    "id": "parent#arbswap",
    "name": "Arbswap",
    "url": "https://arbswap.io",
    "description": "Arbswap is the only true Arbitrum-native DEX suite, offering the best Game-fi services on Nova and the smoothest trading experience on One.",
    "logo": "https://icons.llama.fi/arbswap.jpg",
    "gecko_id": "arbswap",
    "cmcId": null,
    "chains": [],
    "twitter": "ArbswapOfficial",
    "github": [
      "Arbswap-Official"
    ]
  },
  {
    "id": "parent#maia-dao-ecosystem",
    "name": "Maia DAO Ecosystem",
    "url": "https://maiadao.io",
    "description": "One-stop shop for different DeFi native financial instruments, an omnichain fully fledged trading hub.",
    "logo": "https://icons.llama.fi/maia-dao.png",
    "gecko_id": "maia",
    "cmcId": "17181",
    "chains": [],
    "treasury": "maia-dao.js",
    "governanceID": [
      "snapshot:maiadao.eth"
    ],
    "twitter": "MaiaDAOEco",
    "github": [
      "MaiaDAO",
      "Maia-DAO"
    ]
  },
  {
    "id": "parent#thena",
    "name": "THENA",
    "url": "https://www.thena.fi",
    "description": "THENA is a native liquidity layer & AMM on BNB Chain",
    "logo": "https://icons.llama.fi/thena.jpg",
    "gecko_id": "thena",
    "cmcId": "23335",
    "chains": [],
    "twitter": "ThenaFi_",
    "github": [
      "ThenafiBNB"
    ]
  },
  {
    "id": "parent#smbswap",
    "name": "SMBSwap",
    "url": "https://smbswap.finance",
    "description": "SMBSwap is a fast-growing, decentralized platform",
    "logo": "https://icons.llama.fi/smbswap.jpeg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "smbswap",
    "github": [
      "Cr3k"
    ]
  },
  {
    "id": "parent#hydradex",
    "name": "Hydradex",
    "url": "https://hydradex.org/#/swap",
    "description": "Hydra DEX is the native decentralized exchange of Hydra chain",
    "logo": "https://icons.llama.fi/hydradex.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "hydra_chain",
    "github": [
      "Hydra-Chain"
    ]
  },
  {
    "id": "parent#lsdx-finance",
    "name": "LSDx Finance",
    "url": "https://www.lsdx.finance/ethx",
    "description": "LSDx is an ultra-liquid protocol for all LSD",
    "logo": "https://icons.llama.fi/lsdx-finance.jpg",
    "gecko_id": "lsdx-finance",
    "cmcId": null,
    "chains": [],
    "treasury": "lsdx-finance.js",
    "twitter": "LSDxfinance"
  },
  {
    "id": "parent#blur",
    "name": "Blur",
    "url": "https://blur.io/",
    "description": "The NFT marketplace for pro traders",
    "logo": "https://icons.llama.fi/blur-finance.png",
    "gecko_id": "blur",
    "cmcId": null,
    "chains": [
      "Ethereum"
    ],
    "github": [
      "blur-io"
    ],
    "twitter": "blur_io"
  },
  {
    "id": "parent#guru-network-dao",
    "name": "Guru Network DAO",
    "url": "https://ftm.guru/",
    "description": "Multi-Faceted Growth Hacker helping aid On-Chain DApp' Discovery+Utility, Tools & bespoke services to Users & Devs. Home to $ELITE's Growing Multi-chain Treasury",
    "logo": "https://icons.llama.fi/guru-network-dao.png",
    "gecko_id": "ftm-guru",
    "cmcId": "13436",
    "chains": [],
    "twitter": "FTM1337",
    "treasury": "guru-network.js"
  },
  {
    "id": "parent#curve-finance",
    "name": "Curve Finance",
    "url": "https://curve.fi",
    "description": "Creating deep on-chain liquidity using advanced bonding curves",
    "logo": "https://icons.llama.fi/curve.png",
    "gecko_id": "curve-dao-token",
    "cmcId": "6538",
    "chains": [],
    "twitter": "CurveFinance",
    "governanceID": [
      "snapshot:curve.eth"
    ],
    "github": [
      "curvefi"
    ]
  },
  {
    "id": "parent#astar-exchange",
    "name": "Astar Exchange",
    "url": "https://astar.exchange",
    "description": "Decentralized Exchange on Astar",
    "logo": "https://icons.llama.fi/astar-exchange.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AstarExchange"
  },
  {
    "id": "parent#bluemove",
    "name": "BlueMove",
    "url": "https://bluemove.net",
    "description": "The leading Multi-chain NFT Marketplace on Aptos & Sui Blockchain.",
    "logo": "https://icons.llama.fi/bluemove.png",
    "gecko_id": "bluemove",
    "cmcId": "23359",
    "chains": [],
    "twitter": "BlueMove_OA"
  },
  {
    "id": "parent#bubbleswap",
    "name": "Bubbleswap",
    "url": "https://app.bubbleswap.io",
    "description": "A fully decentralized protocol for automated liquidity provision on Hedera.",
    "logo": "https://icons.llama.fi/bubbleswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "bubbleswapio"
  },
  {
    "id": "parent#cream-finance",
    "name": "CREAM Finance",
    "url": "https://cream.finance/",
    "description": "Money markets, liquid staking and protocol-to-protocol lending",
    "logo": "https://icons.llama.fi/cream-finance.png",
    "gecko_id": "cream-2",
    "cmcId": "6193",
    "chains": [],
    "twitter": "CreamdotFinance",
    "governanceID": [
      "snapshot:cream-finance.eth"
    ],
    "github": [
      "CreamFi"
    ]
  },
  {
    "id": "parent#arbitrum-exchange",
    "name": "Arbitrum Exchange",
    "url": "https://arbidex.fi",
    "description": "Dexes on arbitrum.",
    "logo": "https://icons.llama.fi/arbitrum-exchange.jpg",
    "gecko_id": "arbitrum-exchange",
    "cmcId": null,
    "chains": [],
    "twitter": "arbidex_fi"
  },
  {
    "id": "parent#cozy-finance",
    "name": "Cozy Finance",
    "url": "https://www.cozy.finance",
    "description": "Cozy is an open-source protocol for automated and trust-minimized Protection Markets",
    "logo": "https://icons.llama.fi/cozy-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "cozyfinance",
    "github": [
      "Cozy-Finance"
    ]
  },
  {
    "id": "parent#vyfinance",
    "name": "VyFinance",
    "url": "https://vyfi.io",
    "description": "VyFinance offers an ecosystem that's easy to use and accessible for everyone.",
    "logo": "https://icons.llama.fi/vyfinance.png",
    "gecko_id": "vyfinance",
    "cmcId": "17160",
    "chains": [],
    "twitter": "VyFiOfficial",
    "github": [
      "VYFI"
    ]
  },
  {
    "id": "parent#origin-defi",
    "name": "Origin Protocol",
    "url": "https://www.originprotocol.com",
    "description": "Origin Protocol's highly composable, multichain DeFi products unlock opportunities across liquid staking and yield generation. OGN stakers accrue yield from a share of revenue generated by Origin’s products, cultivating a sustainable, user-first platform",
    "logo": "https://icons.llama.fi/origin-protocol.png",
    "gecko_id": "origin-protocol",
    "cmcId": "5117",
    "chains": [],
    "twitter": "OriginProtocol",
    "governanceID": [
      "snapshot:ousdgov.eth",
      "snapshot:origingov.eth",
      "compound:ethereum:0x3cdd07c16614059e66344a7b579dab4f9516c0b6",
      "compound:ethereum:0xc6a3525e2fd8f4844a6fdfe4552a583ce5ac7efa"
    ],
    "github": [
      "OriginProtocol"
    ]
  },
  {
    "id": "parent#avely-finance",
    "name": "Avely Finance",
    "url": "https://avely.fi",
    "description": "Avely is a leading-edge liquid staking protocol built on the Zilliqa blockchain.",
    "logo": "https://icons.llama.fi/avely-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AvelyFinance",
    "github": [
      "avely-finance"
    ]
  },
  {
    "id": "parent#caviar",
    "name": "Caviar",
    "url": "https://www.caviar.sh",
    "description": "Caviar is an NFT AMM that enables you to earn yield and easily provide liquidity for collections.",
    "logo": "https://icons.llama.fi/caviar.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "caviarAMM"
  },
  {
    "id": "parent#tranchess",
    "name": "Tranchess",
    "url": "https://tranchess.com",
    "description": "Yield Enhancing Asset Tracker with Varied Risk-Return Solutions.",
    "logo": "https://icons.llama.fi/tranchess.png",
    "gecko_id": "tranchess",
    "cmcId": "10974",
    "chains": [],
    "twitter": "tranchess",
    "treasury": "tranchess.js",
    "governanceID": [
      "snapshot:tranchess.com"
    ],
    "github": [
      "tranchess"
    ]
  },
  {
    "id": "parent#cryptex-finance",
    "name": "Cryptex Finance",
    "url": "https://cryptex.finance/",
    "description": "Cryptex Finance is a multi-network DeFi protocol with the mission of making crypto-native markets tradable. The protocol uses Ethereum smart contracts, Perennial derivatives vaults, and Chainlink data oracles to provide secure and decentralized trading for users.",
    "logo": "https://icons.llama.fi/cryptex-finance.jpg",
    "gecko_id": "cryptex-finance",
    "cmcId": "10368 ",
    "chains": [],
    "twitter": "CryptexFinance",
    "treasury": "cryptex.js",
    "governanceID": [
      "snapshot:cryptexdao.eth",
      "compound:ethereum:0x271901c3268d0959bbc9543de4f073d3708c88f7"
    ]
  },
  {
    "id": "parent#y2k-finance",
    "name": "Y2K Finance",
    "url": "https://www.y2k.finance",
    "description": "Y2K Finance is a suite of structured products designed for exotic peg derivatives, that will allow market participants the ability to robustly hedge or speculate on the risk of a particular pegged asset (or basket of pegged assets), deviating from their ‘fair implied market value’.",
    "logo": "https://icons.llama.fi/y2k-finance.jpg",
    "gecko_id": "y2k",
    "cmcId": "23043",
    "chains": [],
    "twitter": "y2kfinance"
  },
  {
    "id": "parent#tropykus-finance",
    "name": "Tropykus Finance",
    "url": "https://app.tropykus.com",
    "description": "Lending Protocol on polygon zk and RSK.",
    "logo": "https://icons.llama.fi/tropykus-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "tropykus"
  },
  {
    "id": "parent#pulsex",
    "name": "PulseX",
    "url": "https://pulsex.com/",
    "description": "PulseX enables you to exchange tokens (\"PRC20s\") on PulseChain for one another",
    "logo": "https://icons.llama.fi/pulsex.png",
    "gecko_id": "pulsex",
    "cmcId": "25417",
    "chains": [],
    "twitter": "PulseXcom"
  },
  {
    "id": "parent#synfutures",
    "name": "SynFutures",
    "url": "https://www.synfutures.com/",
    "description": "SynFutures is a leading decentralized protocol for perpetual futures, democratizing the derivatives market by empowering users to trade any asset and create arbitrary futures contracts within seconds",
    "logo": "https://icons.llama.fi/synfutures.svg",
    "gecko_id": "synfutures",
    "cmcId": "1504",
    "chains": [],
    "twitter": "SynFuturesDefi",
    "github": [
      "SynFutures"
    ]
  },
  {
    "id": "parent#shade-protocol",
    "name": "Shade Protocol",
    "url": "https://shadeprotocol.io",
    "description": "A suite of privacy preserving DeFi applications.",
    "logo": "https://icons.llama.fi/shade-protocol.jpg",
    "gecko_id": "shade-protocol",
    "cmcId": "18699",
    "chains": [],
    "twitter": "Shade_Protocol",
    "github": [
      "securesecrets"
    ]
  },
  {
    "id": "parent#paladin-finance",
    "name": "Paladin Finance",
    "url": "https://www.paladin.vote",
    "description": "Paladin is a decentralized, non-custodial governance lending protocol where users can either loan the voting power in their governance token, or borrow some voting power.",
    "logo": "https://icons.llama.fi/paladin-finance.jpg",
    "gecko_id": "paladin",
    "cmcId": "19072",
    "chains": [],
    "twitter": "Paladin_vote",
    "governanceID": [
      "snapshot:palvote.eth"
    ],
    "treasury": "paladin-finance.js",
    "github": [
      "PaladinFinance"
    ]
  },
  {
    "id": "parent#quipuswap",
    "name": "QuipuSwap",
    "url": "https://quipuswap.com",
    "description": "QuipuSwap is an open-source protocol that provides an interface for the seamless decentralized exchange of Tezos-based Tokens, stable swap with dividends, and farming features. Liquidity providers may earn fees from trading, baking rewards, or receive rewards from staking tokens on farms. QuipuSwap smart contracts were developed by the MadFish Team and audited by Least Authority and  Runtime Verification companies",
    "logo": "https://icons.llama.fi/quipuswap.png",
    "gecko_id": "quipuswap-governance-token",
    "cmcId": "13316",
    "chains": [],
    "twitter": "QuipuSwap",
    "github": [
      "madfish-solutions"
    ]
  },
  {
    "id": "parent#predy-finance",
    "name": "Predy Finance",
    "url": "https://www.predy.finance",
    "description": "Trade, Hedge, and Earn through pVault connected AMM.",
    "logo": "https://icons.llama.fi/predy-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "predyfinance",
    "github": [
      "predyprotocol"
    ]
  },
  {
    "id": "parent#magicfox",
    "name": "MagicFox",
    "url": "https://app.magicfox.fi/",
    "description": "MagicFox is Multichain Solidly ve(3,3) Swap & Yield Optimizer on BNB Chain, Arbitrum and Polygon built atop LayerZero.",
    "logo": "https://icons.llama.fi/magicfox.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "magicfoxfi",
    "github": [
      "magicfoxfi"
    ],
    "wrongLiquidity": true
  },
  {
    "id": "parent#magpie-ecosystem",
    "name": "Magpie Ecosystem",
    "url": "https://link3.to/magpiexyz",
    "description": "Magpie is a Multi-chain DeFi platform providing Yield & veTokenomics boosting services",
    "logo": "https://icons.llama.fi/magpie-xyz.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "magpiexyz_io",
    "treasury": "magpie.js",
    "governanceID": [
      "snapshot:magpiexyz.eth"
    ]
  },
  {
    "id": "parent#sudoswap",
    "name": "Sudoswap",
    "url": "https://sudoswap.xyz",
    "description": "The sudoswap AMM is a minimal, gas-efficient AMM protocol for facilitating NFT (ERC721s) to token (ETH or ERC20) swaps using customizable bonding curves",
    "logo": "https://icons.llama.fi/sudoswap.png",
    "gecko_id": "sudoswap",
    "cmcId": null,
    "chains": [],
    "twitter": "sudoswap",
    "governanceID": [
      "eip155:1:0x6853f8865BA8e9FBd9C8CCE3155ce5023fB7EEB0"
    ],
    "treasury": "sudoswap.js",
    "github": [
      "sudoswap"
    ]
  },
  {
    "id": "parent#ramses-exchange",
    "name": "Ramses Exchange",
    "url": "https://app.ramses.exchange/",
    "description": "Ramses is a next-generation AMM designed to serve as Arbitrum's central liquidity hub, combining the secure and battle-tested superiority of Uniswap v3 with a custom incentive engine, vote-lock governance model, and streamlined user experience",
    "logo": "https://icons.llama.fi/ramses-exchange.jpg",
    "gecko_id": "ramses-exchange",
    "cmcId": "23858",
    "chains": [],
    "twitter": "RamsesExchange",
    "github": [
      "RamsesExchange"
    ]
  },
  {
    "id": "parent#maple-finance",
    "name": "Maple Finance",
    "url": "https://www.maple.finance",
    "description": "Maple Finance is an institutional capital marketplace powered by blockchain technology.",
    "logo": "https://icons.llama.fi/maple-finance.jpg",
    "gecko_id": "syrup",
    "cmcId": "33824",
    "chains": [],
    "twitter": "maplefinance",
    "treasury": "maple.js",
    "github": [
      "maple-labs"
    ]
  },
  {
    "id": "parent#pawnfi",
    "name": "Polarise",
    "url": "https://www.polarise.org/",
    "description": "Polarise Protocol aims to be the innovative, multi-chain, multi-form crypto asset financial infrastructure platform",
    "logo": "https://icons.llama.fi/pawnfi.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Polariseorg",
    "governanceID": [
      "snapshot:pawnfiprotocol.eth"
    ],
    "github": [
      "PawnFi"
    ]
  },
  {
    "id": "parent#fuji-finance",
    "name": "Fuji Finance",
    "url": "https://fuji.finance/",
    "description": "The Auto-Refinancing Borrow Protocol",
    "logo": "https://icons.llama.fi/fuji-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "FujiFinance",
    "github": [
      "Fujicracy"
    ]
  },
  {
    "id": "parent#solv-protocol",
    "name": "Solv Protocol",
    "url": "https://solv.finance/",
    "description": "Solv Protocol is a leading Bitcoin staking platform, allowing Bitcoin holders to unlock the full potential of over $1 trillion in Bitcoin assets. By providing secure, transparent staking infrastructure and access to liquid staking tokens (LSTs) like SolvBTC.BBN, Solv is paving the way for Bitcoin’s role in the future of decentralized finance.",
    "logo": "https://icons.llama.fi/solv-protocol.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "SolvProtocol",
    "governanceID": [
      "snapshot:solvgov.eth"
    ],
    "github": [
      "solv-finance"
    ]
  },
  {
    "id": "parent#stabl.fi",
    "name": "Stabl.fi",
    "url": "https://stabl.fi/",
    "description": "$CASH grows in your wallet while you maintain custody of your funds. Yields are generated automatically through open-source, on-chain yield farming strategies",
    "logo": "https://icons.llama.fi/stable.fi.jpg",
    "gecko_id": "stabl-fi",
    "cmcId": null,
    "chains": [],
    "twitter": "Stabl_Fi",
    "stablecoins": [
      "stabl.fi-cash"
    ],
    "github": [
      "StablFi"
    ]
  },
  {
    "id": "parent#zkbob_",
    "name": "zkBob_",
    "url": "https://www.zkbob.com/",
    "description": "A privacy tool for common tasks",
    "logo": "https://icons.llama.fi/zkbob.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "zkBob_",
    "stablecoins": [
      "bob"
    ],
    "github": [
      "zkBob"
    ]
  },
  {
    "id": "parent#claimswap",
    "name": "ClaimSwap",
    "url": "https://claimswap.org/",
    "description": "Swap, earn, and claim on the decentralized, community driven platform",
    "logo": "https://icons.llama.fi/claimswap.jpg",
    "gecko_id": "claimswap",
    "cmcId": null,
    "chains": [],
    "github": [
      "claimswap"
    ],
    "twitter": "claimswap"
  },
  {
    "id": "parent#swapscanner",
    "name": "Swapscanner",
    "url": "https://swapscanner.io/",
    "description": "Swapscanner is a next-generation DEX Aggregator that enables users to buy tokens at the lowest price in the Klaytn Network",
    "logo": "https://icons.llama.fi/swapscanner.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "Swapscanner"
    ],
    "twitter": "Swapscanner"
  },
  {
    "id": "parent#hats.finance",
    "name": "Hats.Finance",
    "url": "https://hats.finance",
    "description": "Hats is an onchain Bug Bounty Protocol, Hats uses incentives to funnel part of the 3.2bn in stolen assets annually into bounties for ethical and responsible disclosures.",
    "logo": "https://icons.llama.fi/hats.finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "hats-finance"
    ],
    "twitter": "HatsFinance"
  },
  {
    "id": "parent#themis-pro",
    "name": "Themis Pro",
    "url": "https://themis.capital/",
    "description": "Themis Protocol is a DeFi protocol on FVM with a portfolio that includes Themis Pro, Themis Swap, Themis Pool, and Themis Stablecoin",
    "logo": "https://icons.llama.fi/themis-pro.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Themis_Pro",
    "treasury": "themis-capital-ohm.js",
    "github": [
      "ThemisCapital"
    ]
  },
  {
    "id": "parent#pepeteam",
    "name": "PepeTeam",
    "url": "https://pepe.team",
    "description": "PepeTeam Products",
    "logo": "https://icons.llama.fi/pepeteam.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "cryptopepeteam",
    "github": [
      "crypto-pepe"
    ]
  },
  {
    "id": "parent#equalizer",
    "name": "Equalizer",
    "url": "https://equalizer.exchange/",
    "description": "Equalizer's twin-AMM design unites StableSwap pools with Standard 'kxy' liquidity pools. All the trading fees go to Vote-Escrowers of emission token $EQUAL which has to be Locked to earn triple 'Bribes' from candidate pools via Trade Fee, Internal Bribes & External Bribes.",
    "logo": "https://icons.llama.fi/equalizer.png",
    "gecko_id": "equalizer-dex",
    "cmcId": null,
    "chains": [],
    "twitter": "Equalizer0x",
    "github": [
      "Equalizer-Exchange"
    ]
  },
  {
    "id": "parent#mango-markets",
    "name": "Mango Markets",
    "url": "https://mango.markets",
    "description": "A magical new way to interact with DeFi. Groundbreaking safety features designed to keep your funds secure. The easiest way to margin trade any token pair. All powered by flashloans.",
    "logo": "https://icons.llama.fi/mango-markets.png",
    "gecko_id": "mango-markets",
    "cmcId": "11171",
    "chains": [],
    "wrongLiquidity": true,
    "twitter": "mangomarkets",
    "treasury": "mango.js",
    "github": [
      "blockworks-foundation"
    ]
  },
  {
    "id": "parent#white-whale",
    "name": "White Whale",
    "url": "https://whitewhale.money",
    "description": "Interchain Liquidity",
    "logo": "https://icons.llama.fi/white-whale.png",
    "gecko_id": "white-whale",
    "cmcId": "16121",
    "chains": [],
    "twitter": "WhiteWhaleDefi",
    "github": [
      "White-Whale-Defi-Platform"
    ]
  },
  {
    "id": "parent#pegasys",
    "name": "PegaSys",
    "url": "https://pegasys.finance",
    "description": "Swap, earn, and build with the leading decentralized crypto trading protocol on Syscoin.",
    "logo": "https://icons.llama.fi/pegasys.png",
    "gecko_id": "pegasys",
    "cmcId": null,
    "chains": [],
    "twitter": "PegasysDAO",
    "github": [
      "pegasys-fi"
    ]
  },
  {
    "id": "parent#jet",
    "name": "Jet",
    "url": "https://www.jetprotocol.io",
    "description": "Jet is a decentralized borrowing and lending protocol built for speed, power, and scalability on Solana",
    "logo": "https://icons.llama.fi/jet.jpg",
    "gecko_id": "jet",
    "cmcId": "12236",
    "chains": [],
    "twitter": "JetProtocol",
    "github": [
      "jet-lab"
    ]
  },
  {
    "id": "parent#biswap",
    "name": "BiSwap",
    "url": "https://biswap.org",
    "description": "Biswap is a trusted DEX platform on the BNB Chain network with a Multi-type Referral Program and low trade fee starting from 0.1%. Biswap is the ecosystem that offers the best service and creates new standards in the DeFi industry.",
    "logo": "https://icons.llama.fi/biswap.jpg",
    "gecko_id": "biswap",
    "cmcId": "10746",
    "chains": [],
    "twitter": "Biswap_Dex",
    "github": [
      "biswap-org"
    ],
    "governanceID": [
      "snapshot:biswap-org.eth"
    ]
  },
  {
    "id": "parent#metastreet",
    "name": "Metastreet",
    "url": "https://metastreet.xyz/",
    "description": "The interest rate protocol for the Metaverse",
    "logo": "https://icons.llama.fi/metastreet.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "metastreetxyz"
  },
  {
    "id": "parent#uncx-network",
    "name": "UNCX Network",
    "url": "https://uncx.network",
    "description": "UNCX Network is a one-stop shop with providing its customers with everything they need to launch and maintain a sustainable and secure protocol. Create your token, secure your LP with our liquidity lockers, vest your supply according to your tokenomics and create farming/staking incentives with customisable rewards.",
    "logo": "https://icons.llama.fi/uncx-network.png",
    "gecko_id": "unicrypt-2",
    "cmcId": "7664",
    "chains": [],
    "twitter": "UNCX_token"
  },
  {
    "id": "parent#swaap",
    "name": "Swaap",
    "url": "https://www.swaap.finance",
    "description": "Swaap is a market neutral AMM.",
    "logo": "https://icons.llama.fi/swaap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "SwaapFinance"
  },
  {
    "id": "parent#mare-finance",
    "name": "Mare Finance",
    "url": "https://mare.finance",
    "description": "Mare Finance is a decentralized lending protocol for individuals, institutions and protocols to access financial services. It is a permissionless, open source protocol serving users on Kava. Users can deposit their assets, use them as collateral and borrow against them.",
    "logo": "https://icons.llama.fi/mare-finance.png",
    "gecko_id": "mare-finance",
    "cmcId": "23835",
    "chains": [],
    "twitter": "MareFinance",
    "github": [
      "mare-finance"
    ]
  },
  {
    "id": "parent#chainlink",
    "name": "Chainlink",
    "url": "https://chain.link",
    "description": "Chainlink decentralized oracle networks provide tamper-proof inputs, outputs, and computations to support advanced smart contracts on any blockchain.",
    "logo": "https://icons.llama.fi/chainlink.jpg",
    "gecko_id": "chainlink",
    "cmcId": "1975",
    "chains": [],
    "twitter": "chainlink"
  },
  {
    "id": "parent#fusionx-finance",
    "name": "FusionX Finance",
    "url": "https://fusionx.finance",
    "description": "FusionX builds the native DeFi ecosystem of Mantle Network which powers it’s concentrated liquidity AMM which is highly efficient, isolated perpetual Dex and LSD based products coming up shortly.",
    "logo": "https://icons.llama.fi/fusionx-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "FusionX_Finance",
    "github": [
      "FusionX-Finance"
    ]
  },
  {
    "id": "parent#venus-finance",
    "name": "Venus",
    "url": "https://venus.io/",
    "description": "A Decentralized Marketplace for Lenders and Borrowers with Borderless Stablecoins",
    "logo": "https://icons.llama.fi/venus.jpg",
    "gecko_id": "venus",
    "cmcId": "7288",
    "chains": [],
    "twitter": "VenusProtocol",
    "github": [
      "VenusProtocol"
    ],
    "treasury": "venus.js",
    "governanceID": [
      "snapshot:venus-xvs.eth"
    ],
    "stablecoins": [
      "vai"
    ]
  },
  {
    "id": "parent#hatom-protocol",
    "name": "Hatom Protocol",
    "url": "https://app.hatom.com",
    "description": "Hatom Protocol is a decentralized algorithmic protocol for lending, borrowing, and staking assets, that operates on the MultiversX Blockchain.",
    "logo": "https://icons.llama.fi/hatom-protocol.jpg",
    "gecko_id": "hatom",
    "cmcId": "27686",
    "chains": [],
    "twitter": "HatomProtocol",
    "github": [
      "HatomProtocol"
    ]
  },
  {
    "id": "parent#rehold",
    "name": "ReHold",
    "url": "https://reholdio.com",
    "description": "Multichain Trading Protocol. Trade, Earn, Swap across Bitcoin and EVM.",
    "logo": "https://icons.llama.fi/rehold.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "rehold_io",
    "github": [
      "rehold-io"
    ]
  },
  {
    "id": "parent#stellaswap",
    "name": "StellaSwap",
    "url": "https://stellaswap.com",
    "description": "All your DeFi needs in one place. Swap, earn and build on Moonbeam's leading DEX",
    "logo": "https://icons.llama.fi/stellaswap.jpg",
    "gecko_id": "stellaswap",
    "cmcId": "17358",
    "chains": [],
    "twitter": "StellaSwap",
    "github": [
      "stellaswap"
    ]
  },
  {
    "id": "parent#reax-finance",
    "name": "Reax Finance",
    "url": "https://reax.one/",
    "description": "Trade, Lend, Borrow and Leverage on Crypto, Stocks, Forex, Commodities & more, Slippage Free, on Mantle",
    "logo": "https://icons.llama.fi/stellaswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ReaxFinance"
  },
  {
    "id": "parent#pika-protocol",
    "name": "Pika Protocol",
    "url": "https://pikaprotocol.com",
    "description": "A Perpetual Swap Exchange",
    "logo": "https://icons.llama.fi/pika-protocol.jpg",
    "gecko_id": "pika-protocol",
    "cmcId": "25148",
    "chains": [],
    "twitter": "PikaProtocol"
  },
  {
    "id": "parent#teahouse-finance",
    "name": "Teahouse Finance",
    "url": "https://vault.teahouse.finance",
    "description": "Teahouse is a multi-strategy DeFi asset manager similar to a hedge fund. We help enterprise and individual clients grow their crypto assets on our secure and transparent platform.",
    "logo": "https://icons.llama.fi/teahouse-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "TeahouseFinance"
  },
  {
    "id": "parent#dexfinance",
    "name": "DexFinance",
    "url": "https://app.dexfinance.com/swap",
    "description": "Bringing the world tools to optimize and simplify DeFi investing.",
    "logo": "https://icons.llama.fi/dexfinance.png",
    "gecko_id": "dexfi-governance",
    "cmcId": null,
    "chains": [],
    "treasury": "dexfinance.js",
    "github": [
      "dexIRA"
    ],
    "twitter": "DexFinance"
  },
  {
    "id": "parent#trufin-protocol",
    "name": "TruFin Protocol",
    "url": "https://www.trufin.io/",
    "description": "TruFin provides institutional-grade Web3 primitives, such as liquid staking, that can be used as the foundational building blocks for digital asset strategies to reduce risk, generate rewards, securely on-chain.",
    "logo": "https://icons.llama.fi/trufin-protocol.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "TruFinProtocol"
  },
  {
    "id": "parent#jewelswap",
    "name": "JewelSwap",
    "url": "https://www.jewelswap.io/",
    "description": "JewelSwap is an NFT lending liquidity protocol and AMM marketplace on the MultiversX blockchain, facilitating NFT collateralized lending and enhancing NFT liquidity through single and two-sided liquidity pools",
    "logo": "https://icons.llama.fi/jewelswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "JewelSwapX"
  },
  {
    "id": "parent#factor",
    "name": "Factor",
    "url": "https://factor.fi/",
    "description": "Factor: A no-code middleware infrastructure enabling seamless creation, management, and integration of DeFi assets and liquidity pools via a unified interface",
    "logo": "https://icons.llama.fi/factor.jpg",
    "gecko_id": "factor",
    "cmcId": "23502",
    "chains": [],
    "twitter": "Factor_fi",
    "github": [
      "Factor_fi"
    ],
    "treasury": "factor-dao.js"
  },
  {
    "id": "parent#velodrome",
    "name": "Velodrome",
    "url": "https://velodrome.finance",
    "description": "A revolutionary new AMM based on Solidly launched on Optimism.",
    "logo": "https://icons.llama.fi/velodrome.png",
    "gecko_id": "velodrome-finance",
    "cmcId": "20435",
    "chains": [],
    "twitter": "VelodromeFi",
    "github": [
      "velodrome-finance"
    ],
    "treasury": "velodrome.js",
    "governanceID": [
      "compound:ethereum:0xa1d8800ae2f4794f2910cfcd835831faae69cea0"
    ]
  },
  {
    "id": "parent#grizzlyfi",
    "name": "Grizzlyfi",
    "url": "https://grizzly.fi/",
    "description": "Grizzly.fi is a cryptocurrency platform that aggregates and integrates various DeFi protocols and yield sources to facilitate long-term investments",
    "logo": "https://icons.llama.fi/jewelswap.png",
    "gecko_id": "grizzly-honey",
    "cmcId": "21198",
    "chains": [],
    "twitter": "GrizzlyFi",
    "github": [
      "grizzlyfi"
    ]
  },
  {
    "id": "parent#lodestar-finance",
    "name": "Lodestar Finance",
    "url": "https://www.lodestarfinance.io",
    "description": "Lodestar Finance is an algorithmic borrowing and lending protocol that aims to bring the critical DeFi primitive of decentralized money markets to Arbitrum communities.",
    "logo": "https://icons.llama.fi/lodestar-finance.png",
    "gecko_id": "lodestar",
    "cmcId": "24178",
    "chains": [],
    "twitter": "LodestarFinance",
    "governanceID": [
      "snapshot:lodestarfinance.eth"
    ]
  },
  {
    "id": "parent#sablier-finance",
    "name": "Sablier",
    "url": "https://sablier.com/",
    "description": "Sablier provides infrastructure for onchain token distribution. DAOs and businesses use Sablier for vesting, payroll, airdrops, and more.",
    "logo": "https://icons.llama.fi/sablier-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Sablier"
  },
  {
    "id": "parent#velocore",
    "name": "Velocore",
    "url": "https://velocore.xyz",
    "description": "Velocore is a ve(3,3) DEX with real-time voting.",
    "logo": "https://icons.llama.fi/velocore.png",
    "gecko_id": "telos-velocore",
    "cmcId": null,
    "chains": [],
    "twitter": "velocorexyz"
  },
  {
    "id": "parent#chronos",
    "name": "Chronos",
    "url": "https://chronos.exchange/",
    "description": "Chronos is a community-owned decentralized exchange (DEX) and liquidity provider constructed on Arbitrum",
    "logo": "https://icons.llama.fi/chronos.png",
    "gecko_id": "chronos-finance",
    "cmcId": "24158",
    "chains": [],
    "twitter": "ChronosFi_",
    "github": [
      "ChronosEx"
    ]
  },
  {
    "id": "parent#echodex",
    "name": "EchoDEX",
    "url": "https://www.echodex.io",
    "description": "EchoDEX, a decentralized exchange platform built on the Linea Consensys network.",
    "logo": "https://icons.llama.fi/echodex.jpg",
    "gecko_id": "echodex-community-portion",
    "cmcId": "27690",
    "chains": [],
    "twitter": "Echo_DEX"
  },
  {
    "id": "parent#gmx",
    "name": "GMX",
    "url": "https://gmx.io",
    "description": "GMX is a decentralized spot and perpetual exchange that supports low swap fees and zero price impact trades. Trading is supported by a unique multi-asset pool that earns liquidity providers fees from market making, swap fees, leverage trading (spreads, funding fees & liquidations) and asset rebalancing.",
    "logo": "https://icons.llama.fi/gmx.png",
    "gecko_id": "gmx",
    "cmcId": "11857",
    "chains": [],
    "twitter": "GMX_IO",
    "governanceID": [
      "snapshot:gmx.eth"
    ],
    "github": [
      "gmx-io"
    ]
  },
  {
    "id": "parent#swapbased",
    "name": "SwapBased",
    "url": "https://swapbased.finance",
    "description": "Kickstarting the Base ecosystem, SwapBased is THE DEX on Base.",
    "logo": "https://icons.llama.fi/swapbased.jpg",
    "gecko_id": "base",
    "cmcId": "27789",
    "chains": [],
    "twitter": "swap_based"
  },
  {
    "id": "parent#ede",
    "name": "EDE",
    "url": "https://ede.finance",
    "description": "Kickstarting the Base ecosystem, SwapBased is THE DEX on Base.",
    "logo": "https://icons.llama.fi/ede.png",
    "gecko_id": "el-dorado-exchange",
    "cmcId": "22810",
    "chains": [],
    "twitter": "ede_finance",
    "governanceID": [
      "snapshot:edefinance.eth"
    ]
  },
  {
    "id": "parent#throne",
    "name": "Throne",
    "url": "hhttps://throne.exchange",
    "description": "A Majestic Native DEX Reigning over the Base Ecosystem. Fortified by the Community, Empowered by V3 Protocol.",
    "logo": "https://icons.llama.fi/throne.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ThroneDEX"
  },
  {
    "id": "parent#synthswap",
    "name": "Synthswap",
    "url": "https://synthswap.io",
    "description": "A Majestic Native DEX Reigning over the Base Ecosystem. Fortified by the Community, Empowered by V3 Protocol.",
    "logo": "https://icons.llama.fi/synthswap.jpg",
    "gecko_id": "synthswap",
    "cmcId": "27759",
    "chains": [],
    "twitter": "synthswapio"
  },
  {
    "id": "parent#cookiebase",
    "name": "CookieBase",
    "url": "https://cookiebase.xyz",
    "description": "Sweeten your DeFi journey with CookieBase! Embrace creamy yields and crumbly rewards on Base Blockchain",
    "logo": "https://icons.llama.fi/cookiebase.jpg",
    "gecko_id": "cookiebase",
    "cmcId": null,
    "chains": [],
    "twitter": "base_cookie"
  },
  {
    "id": "parent#onering",
    "name": "OneRing",
    "url": "https://www.onering.tools",
    "description": "One Ring is a Multi-Chain Cross-Stable Yield Optimizer Platform.",
    "logo": "https://icons.llama.fi/onering.jpg",
    "gecko_id": "onering",
    "cmcId": null,
    "chains": [],
    "twitter": "Onering_Tools"
  },
  {
    "id": "parent#meta-pool",
    "name": "Meta Pool",
    "url": "https://metapool.app",
    "description": "Meta Pool is a liquid staking protocol built on the NEAR and Ethereum blockchain.",
    "logo": "https://icons.llama.fi/meta-pool.png",
    "gecko_id": "meta-pool",
    "cmcId": "18755",
    "chains": [],
    "twitter": "meta_pool"
  },
  {
    "id": "parent#baseswap",
    "name": "BaseSwap",
    "url": "https://baseswap.fi/",
    "description": "Native DEX on Base chain",
    "logo": "https://icons.llama.fi/baseswap.png",
    "gecko_id": "baseswap",
    "cmcId": "27764",
    "chains": [],
    "twitter": "BaseSwapDex",
    "treasury": "baseswap.js"
  },
  {
    "id": "parent#scallop",
    "name": "Scallop",
    "url": "https://scallop.io",
    "description": "Scallop is the pioneering Next Generation Money Market for the Sui ecosystem which emphasizes institutional-grade quality, enhanced composability, and robust security.",
    "logo": "https://icons.llama.fi/scallop.png",
    "gecko_id": "scallop-2",
    "cmcId": "29679",
    "chains": [],
    "twitter": "Scallop_io",
    "github": [
      "scallop-io"
    ]
  },
  {
    "id": "parent#spacefi",
    "name": "SpaceFi",
    "url": "https://spacefi.io",
    "description": "SpaceFi is a cross-chain web3.0 platform, with DEX+Farm+NFT+Starter+Spacebase.",
    "logo": "https://icons.llama.fi/spacefi.png",
    "gecko_id": "spacefi-zksync",
    "cmcId": null,
    "chains": [],
    "twitter": "spacefi_io",
    "github": [
      "SpaceFinance"
    ]
  },
  {
    "id": "parent#knightswap",
    "name": "KnightSwap",
    "url": "https://knightswap.financial",
    "description": "Trade, Earn, & Raid To Stack Your Riches While Securely Storing Them Within Our Castle Vaults.",
    "logo": "https://icons.llama.fi/knightswap-finance.png",
    "gecko_id": "knightswap",
    "cmcId": "15841",
    "chains": [],
    "twitter": "KnightEcosystem",
    "github": [
      "Knightswap"
    ]
  },
  {
    "id": "parent#alien-base",
    "name": "Alien Base",
    "url": "https://alienbase.xyz/",
    "description": "Alien Base is building the Base trading hub for efficiently trading tokens and memecoins onchain. Offering aggregated liquidity, limit orders, yield farming and more, Alien technology helps you use Base to the fullest.",
    "logo": "https://icons.llama.fi/alien-base.png",
    "gecko_id": "alienbase",
    "cmcId": "30543",
    "chains": [],
    "twitter": "AlienBaseDEX",
    "github": [
      "alienbase-xyz"
    ],
    "treasury": "alienbase.js"
  },
  {
    "id": "parent#lybra-finance",
    "name": "Lybra Finance",
    "url": "https://lybra.finance",
    "description": "Lybra Finance is developing the next generation of Omnichain LSD-based stablecoins",
    "logo": "https://icons.llama.fi/lybra-finance.jpg",
    "gecko_id": "lybra-finance",
    "cmcId": "24700",
    "chains": [],
    "twitter": "LybraFinanceLSD",
    "github": [
      "LybraFinance"
    ],
    "stablecoins": [
      "peg-eusd"
    ]
  },
  {
    "id": "parent#astarter",
    "name": "Astarter",
    "url": "https://astarter.io/",
    "description": "Astarter is a key DeFi infrastructure hub on Cardano that features four core applications: Launchpad(Launchpool), DEX, Money Market & Tech Service Platform, with the backing of EMURGO, a founding entity of the Cardano protocol. Astarter aims to elevate its contribution and bring broader possibilities to the Cardano ecosystem by providing fair, safe, and accessible open finance services to meet existing and future demand in accelerating DeFi apps to empower the next generation of projects built on Cardano.",
    "logo": "https://icons.llama.fi/astarter.png",
    "gecko_id": "astarter",
    "cmcId": null,
    "chains": [],
    "twitter": "AstarterDefiHub"
  },
  {
    "id": "parent#myso",
    "name": "MYSO",
    "url": "https://www.myso.finance",
    "description": "We're building a liquidation-free, fixed-interest and oracle-free borrowing solution. Borrowers are freed from liquidation risk while liquidity providers gain exposure to a passive option writing strategy, unlocking option selling as a sustainable yield source.",
    "logo": "https://icons.llama.fi/myso.jpg",
    "gecko_id": "myso-token",
    "cmcId": null,
    "chains": [],
    "twitter": "MysoFinance"
  },
  {
    "id": "parent#solidly-labs",
    "name": "Solidly Labs",
    "url": "https://solidly.com",
    "description": "Self-optimizing DEX combining the best of Curve, Uniswap and ve(3,3)",
    "logo": "https://icons.llama.fi/solidly-labs.jpg",
    "gecko_id": "solidlydex",
    "cmcId": null,
    "chains": [],
    "twitter": "SolidlyLabs"
  },
  {
    "id": "parent#morphex",
    "name": "Morphex",
    "url": "https://www.morphex.trade",
    "description": "Decentralized perpetual exchange on Fantom and BNB Chain",
    "logo": "https://icons.llama.fi/morphex.jpg",
    "gecko_id": "mpx",
    "cmcId": "23431",
    "chains": [],
    "twitter": "MorphexFTM"
  },
  {
    "id": "parent#empmoney",
    "name": "EmpMoney",
    "url": "https://emp.money",
    "description": "Where yield farming , staking pools, AMM & a seamless.",
    "logo": "https://icons.llama.fi/empmoney.jpg",
    "gecko_id": "emp-money",
    "cmcId": "17633",
    "chains": [],
    "twitter": "EmpMoneyBSC"
  },
  {
    "id": "parent#premia",
    "name": "Premia",
    "url": "https://premia.finance",
    "description": "Premia's automated options market enables best-in-class pricing based on realtime supply and demand, bringing fully-featured peer-to-pool trading and capital efficiency to DeFi options.",
    "logo": "https://icons.llama.fi/premia.jpg",
    "gecko_id": "premia",
    "cmcId": "8476",
    "chains": [],
    "twitter": "PremiaFinance",
    "governanceID": [
      "snapshot:premia.eth"
    ],
    "github": [
      "Premian-Labs"
    ]
  },
  {
    "id": "parent#dackieswap",
    "name": "DackieSwap",
    "url": "https://dackieswap.xyz",
    "description": "The Premier Multichain DEX with AI Agent Technology",
    "logo": "https://icons.llama.fi/dackieswap.jpg",
    "gecko_id": "dackieswap",
    "cmcId": "26979",
    "chains": [],
    "twitter": "DackieSwap",
    "github": [
      "DackieSwap"
    ]
  },
  {
    "id": "parent#messina.one",
    "name": "Messina.one",
    "url": "https://messina.one",
    "description": "Messina.one is a cross-chain protocol built on top of Wormhole that aims to enable the next 1B blockchain users.",
    "logo": "https://icons.llama.fi/messina.one.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "MessinaOne"
  },
  {
    "id": "parent#w3-foundation",
    "name": "W3 Foundation",
    "url": "https://w3swap.link/",
    "description": "W3 Foundation: A decentralized organization built on the W3 community, dedicated to the sustainable development of the W3 ecosystem. ",
    "logo": "https://icons.llama.fi/w3-foundation.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "w3_foundation"
  },
  {
    "id": "parent#kinetix",
    "name": "Kinetix",
    "url": "https://kinetix.finance/",
    "description": "A one-stop DeFi Hub built exclusively on Kava EVM",
    "logo": "https://icons.llama.fi/kinetix.png",
    "gecko_id": "kinetixfi",
    "cmcId": null,
    "chains": [],
    "twitter": "KinetixFi"
  },
  {
    "id": "parent#tangible",
    "name": "Tangible",
    "url": "https://www.tangible.store",
    "description": "Maintain purchasing power with the first stablecoin backed by tokenized, yield-generating real estate.",
    "logo": "https://icons.llama.fi/tangible.png",
    "gecko_id": "tangible",
    "cmcId": "20271",
    "chains": [],
    "twitter": "tangibleDAO",
    "stablecoins": [
      "real-usd"
    ]
  },
  {
    "id": "parent#shoebill-finance",
    "name": "Shoebill Finance",
    "url": "https://shoebill.finance",
    "description": "Positive sum DeFi lending protocol. Zero-interest borrowing and stable yield lending.",
    "logo": "https://icons.llama.fi/shoebill-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ShoebillFinance"
  },
  {
    "id": "parent#vvs-finance",
    "name": "VVS Finance",
    "url": "https://vvs.finance",
    "description": "VVS is designed to be the simplest DeFi platform for users to swap tokens, earn high yields, and most importantly have fun!",
    "logo": "https://icons.llama.fi/vvs-finance.png",
    "gecko_id": "vvs-finance",
    "cmcId": "14519",
    "chains": [],
    "twitter": "VVS_finance",
    "github": [
      "vvs-finance"
    ]
  },
  {
    "id": "parent#aperture-finance",
    "name": "Aperture Finance",
    "url": "https://aperture.finance",
    "description": "Cross-chain investment ecosystem with a community-driven marketplace for strategies. All your DeFi needs taken care of in one single place.",
    "logo": "https://icons.llama.fi/aperture-finance.png",
    "gecko_id": "aperture-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "ApertureFinance"
  },
  {
    "id": "parent#tprotocol",
    "name": "TProtocol",
    "url": "https://www.tprotocol.io",
    "description": "RWA Liquidity Hub",
    "logo": "https://icons.llama.fi/tprotocol.jpg",
    "gecko_id": "rebasing-tbt",
    "cmcId": null,
    "chains": [],
    "twitter": "TProtocol_",
    "treasury": "tprotocol.js",
    "github": [
      "TProtocol"
    ]
  },
  {
    "id": "parent#marginfi",
    "name": "marginfi",
    "url": "https://app.marginfi.com",
    "description": "Connecting liquidity across DeFi",
    "logo": "https://icons.llama.fi/marginfi.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "marginfi"
  },
  {
    "id": "parent#glacier-finance",
    "name": "Glacier Finance",
    "url": "https://glacier.exchange/",
    "description": "Glacier Finance is a community-driven trading and liquidity hub.",
    "logo": "https://icons.llama.fi/glacier-finance.png",
    "gecko_id": "glacier",
    "cmcId": "24434",
    "chains": [],
    "twitter": "Glacier_Fi"
  },
  {
    "id": "parent#perennial",
    "name": "Perennial",
    "url": "https://perennial.finance",
    "description": "Perennial is a decentralized derivatives protocol built from first-principles to be a powerful, flexible, and composable primitive that can scale to meet the needs of DeFi traders, liquidity providers, and developers.",
    "logo": "https://icons.llama.fi/perennial.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "perenniallabs"
  },
  {
    "id": "parent#taiga-protocol",
    "name": "Taiga Protocol",
    "url": "https://www.taigaprotocol.io/",
    "description": "A synthetic asset protocol designed to enable maximum efficiency for uniform assets on Kusama and Acala",
    "logo": "https://icons.llama.fi/taiga-protocol.png",
    "gecko_id": "taiga",
    "cmcId": null,
    "chains": [],
    "twitter": "TaigaProtocol",
    "github": [
      "nutsfinance"
    ],
    "stablecoins": [
      "3usd"
    ]
  },
  {
    "id": "parent#contango",
    "name": "Contango",
    "url": "https://contango.xyz",
    "description": "Contango lets you loop anything on-chain. You can create leverage (re)staking positions, arb rates differentials, farm points, or simply go long or short like a perp at low funding.",
    "logo": "https://icons.llama.fi/contango.png",
    "gecko_id": "contango",
    "cmcId": null,
    "chains": [],
    "treasury": "contango.js",
    "twitter": "Contango_xyz"
  },
  {
    "id": "parent#levvy-finance",
    "name": "Levvy Finance",
    "url": "https://www.levvy.fi",
    "description": "An NFT lending protocol on Cardano.  Borrow $ADA instantly with your Cardano NFT's or lend $ADA to earn $ADA",
    "logo": "https://icons.llama.fi/levvy-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "levvyfinance"
  },
  {
    "id": "parent#voltage",
    "name": "Voltage",
    "url": "https://app.voltage.finance",
    "description": "Built atop the powerful Fuse blockchain and ecosystem, Voltage enables anyone to carry the power of DeFi in their pocket.",
    "logo": "https://icons.llama.fi/voltage.png",
    "gecko_id": "fusefi",
    "cmcId": "12038",
    "chains": [],
    "twitter": "voltfinance"
  },
  {
    "id": "parent#pacificswap",
    "name": "PacificSwap",
    "url": "https://pacificswap.xyz",
    "description": "An innovative CLAMM using incentive-alignment to keep the liquidity flywheel moving on MantaNetwork",
    "logo": "https://icons.llama.fi/pacificswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "pacificswap",
    "github": [
      "Pacificswap"
    ]
  },
  {
    "id": "parent#aftermath-finance",
    "name": "Aftermath Finance",
    "url": "https://aftermath.finance",
    "description": "CEX on-chain. Built on Sui",
    "logo": "https://icons.llama.fi/aftermath-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AftermathFi",
    "github": [
      "AftermathFinance"
    ]
  },
  {
    "id": "parent#hope-money",
    "name": "HOPE Money",
    "url": "https://hope.money",
    "description": "All-in-one DeFi ecosystem featuring crypto-native distributed #stablecoin $HOPE.",
    "logo": "https://icons.llama.fi/hope-money.jpg",
    "gecko_id": "hope-2",
    "cmcId": null,
    "chains": [],
    "twitter": "Hope_money_",
    "github": [
      "Light-Ecosystem"
    ]
  },
  {
    "id": "parent#nostra",
    "name": "Nostra",
    "symbol": "NSTR",
    "url": "https://nostra.finance/",
    "description": "Nostra is the crypto Super App, powered by Starknet, where users can lend, borrow, swap, and bridge cryptocurrencies.",
    "logo": "https://icons.llama.fi/nostra.jpg",
    "gecko_id": "nostra",
    "cmcId": "22743",
    "chains": [],
    "twitter": "nostrafinance"
  },
  {
    "id": "parent#vapordex",
    "name": "VaporDex",
    "url": "https://www.vapordex.io",
    "description": "The World  Most Rewarding DEX. Automatically earn rewards that boost your savings just by using VaporDEX",
    "logo": "https://icons.llama.fi/vapordex.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "VaporDex",
    "github": [
      "VaporFi"
    ]
  },
  {
    "id": "parent#maker",
    "name": "Maker",
    "url": "https://makerdao.com/en/",
    "description": "Builders of Dai, a digital currency that can be used by anyone, anywhere, anytime.",
    "logo": "https://icons.llama.fi/maker.jpg",
    "gecko_id": "maker",
    "cmcId": "1518",
    "chains": [],
    "twitter": "MakerDAO",
    "treasury": "maker.js",
    "stablecoins": [
      "dai"
    ],
    "github": [
      "makerdao"
    ]
  },
  {
    "id": "parent#caviarnine",
    "name": "CaviarNine",
    "url": "https://www.caviarnine.com/",
    "description": "CaviarNine is a fintech company focused on providing DeFi trading products built on the Radix platform",
    "logo": "https://icons.llama.fi/caviarnine.png",
    "gecko_id": "floop",
    "cmcId": null,
    "chains": [],
    "twitter": "CaviarNine"
  },
  {
    "id": "parent#marinade-finance",
    "name": "Marinade",
    "url": "https://marinade.finance/",
    "description": "All you ever need in one place for Solana Staking",
    "logo": "https://icons.llama.fi/marinade.jpg",
    "gecko_id": "marinade",
    "cmcId": "13803",
    "chains": [],
    "twitter": "MarinadeFinance",
    "github": [
      "marinade-finance"
    ],
    "treasury": "marinade.js"
  },
  {
    "id": "parent#sienna-network",
    "name": "Sienna Network",
    "url": "https://sienna.network",
    "description": "Sienna Network is a cross-chain, privacy-first decentralized finance protocol built on Secret Network, that enables trust-less financial instruments, such as trading and lending with complete privacy for multiple blockchain ecosystems.",
    "logo": "https://icons.llama.fi/sienna-network.png",
    "gecko_id": "sienna",
    "cmcId": "9388",
    "chains": [],
    "twitter": "sienna_network",
    "github": [
      "SiennaNetwork"
    ]
  },
  {
    "id": "parent#lifinity",
    "name": "Lifinity",
    "url": "https://lifinity.io/pools",
    "description": "The first proactive market maker on Solana designed to improve capital efficiency and reduce impermanent loss.",
    "logo": "https://icons.llama.fi/lifinity.jpg",
    "gecko_id": "lifinity",
    "cmcId": "19842",
    "chains": [],
    "twitter": "Lifinity_io"
  },
  {
    "id": "parent#swell",
    "name": "Swell",
    "url": "https://www.swellnetwork.io/",
    "description": "A non-custodial ETH liquid staking protocol that helps you optimize yield in DeFi",
    "logo": "https://icons.llama.fi/swell.png",
    "gecko_id": "swell-network",
    "cmcId": "24924",
    "chains": [],
    "twitter": "swellnetworkio",
    "github": [
      "SwellNetwork"
    ]
  },
  {
    "id": "parent#velvet.capital",
    "name": "Velvet.Capital",
    "url": "https://www.velvet.capital/",
    "description": "Velvet.Capital is a DeFi Asset Management protocol which helps people & institutions create diversified financial products (tokenized funds, portfolios, yield farming strategies and other structured products)",
    "logo": "https://icons.llama.fi/velvet.capital.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Velvet_Capital"
  },
  {
    "id": "parent#pooltogether",
    "name": "PoolTogether",
    "url": "https://pooltogether.com/",
    "description": "PoolTogether is an open source and decentralized protocol for no-loss prize games",
    "logo": "https://icons.llama.fi/pooltogether.jpg",
    "gecko_id": "pooltogether",
    "cmcId": "8508",
    "chains": [],
    "twitter": "PoolTogether_",
    "github": [
      "pooltogether"
    ],
    "treasury": "pooltogether.js",
    "governanceID": [
      "snapshot:pooltogether.eth",
      "snapshot:poolpool.pooltogether.eth",
      "eip155:1:0xB3a87172F555ae2a2AB79Be60B336D2F7D0187f0"
    ]
  },
  {
    "id": "parent#aptin-finance",
    "name": "Aptin Finance",
    "url": "https://aptin.io",
    "description": "Aptin is an algorithmic, decentralized protocol for lending and borrowing on Aptos. Aptin enables users to effortlessly lend, borrow, and earn interest within a global network.",
    "logo": "https://icons.llama.fi/aptin-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AptinLabs"
  },
  {
    "id": "parent#algebra",
    "name": "Algebra",
    "url": "https://algebra.finance/",
    "description": "Providing DEXs with the best concentrated liquidity solutions. Increase both capital efficiency & user convenience of your project effortlessly.",
    "logo": "https://icons.llama.fi/algebra.jpg",
    "gecko_id": "algebra",
    "cmcId": "13211",
    "chains": [],
    "github": [
      "cryptoalgebra"
    ],
    "twitter": "CryptoAlgebra"
  },
  {
    "id": "parent#swapsicle",
    "name": "Swapsicle",
    "url": "https://www.swapsicle.io",
    "description": "Swapsicle is more than a DEX. Swapsicle features a dual token economy, single sided staking, utility NFTs, perpetuals trading, and much more. SLUSH is our native liquid token used for minting NFT’s and market trading. ICE is our farm reward token utilized inside our suite of products to earn additional real yield for users.",
    "logo": "https://icons.llama.fi/swapsicle.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "swapsicledex"
    ],
    "twitter": "SwapsicleDEX"
  },
  {
    "id": "parent#kamino-finance",
    "name": "Kamino",
    "url": "https://kamino.finance/",
    "description": "Kamino: Solana's lending, liquidity & leverage venue",
    "logo": "https://icons.llama.fi/kamino.jpg",
    "gecko_id": "kamino",
    "cmcId": "30986",
    "chains": [],
    "github": [
      "hubbleprotocol"
    ],
    "twitter": "KaminoFinance"
  },
  {
    "id": "parent#chimeradex",
    "name": "Chimeradex",
    "url": "https://app.chimeradex.com/",
    "description": "Swap, finance and earn built on the leading liquidity lending protocol",
    "logo": "https://icons.llama.fi/chimeradex.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "chimeradex"
    ],
    "twitter": "Chi_meradex"
  },
  {
    "id": "parent#hummus-exchange",
    "name": "Hummus Exchange",
    "url": "https://www.hummus.exchange",
    "description": "The Hummus protocol is a single-side Automated Market Maker designed for exchanging stable cryptocurrencies on the Metis blockchain.",
    "logo": "https://icons.llama.fi/hummus-exchange.png",
    "gecko_id": "hummus",
    "cmcId": "19625",
    "chains": [],
    "twitter": "hummusdefi"
  },
  {
    "id": "parent#voodoo-trade",
    "name": "Voodoo Trade",
    "url": "https://voodoo.trade",
    "description": "Voodoo Trade is the ultimate ETH-focused perpetual DEX on Base Network. Voodoo caters solely to the ETH/USDC pair, offering the deepest liquidity and most competitive margin fees available, on par with CEX rates. LPs can earn real yield from both margin trades and swaps on Base's most highly traded pair, with no need to hold any tokens besides ETH and stables. Voodoo is a fair launch platform with support from an array of Base Ecosystem stakeholders, and implements a long-term oriented tokenomics system that is the first of its kind for perpetual DEXs.",
    "logo": "https://icons.llama.fi/voodoo-trade.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "TradeVoodoo",
    "github": [
      "voodoo-trade"
    ]
  },
  {
    "id": "parent#notional",
    "name": "Notional",
    "url": "https://notional.finance",
    "description": "Fixed rate lending on Ethereum",
    "logo": "https://icons.llama.fi/notional.jpg",
    "gecko_id": "notional-finance",
    "cmcId": "14631",
    "chains": [],
    "twitter": "NotionalFinance",
    "governanceID": [
      "snapshot:notional.eth"
    ],
    "github": [
      "notional-finance"
    ],
    "treasury": "notional.js"
  },
  {
    "id": "parent#bedrock",
    "name": "Bedrock",
    "url": "https://www.bedrock.technology",
    "description": "Bedrock is a non-custodial solution designed in partnership with RockX, a longstanding blockchain infrastructure company with strong roots in crypto staking. Designed with institutions in mind, Bedrock is a platform focused on security, compliance, and transparency.",
    "logo": "https://icons.llama.fi/bedrock.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Bedrock_DeFi",
    "github": [
      "Bedrock-Technology"
    ]
  },
  {
    "id": "parent#rollup-finance",
    "name": "Rollup Finance",
    "url": "https://www.rollup.finance/",
    "description": "Decentralized Perpetual Derivatives Trading Exchange",
    "logo": "https://icons.llama.fi/rollup-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Rollup_Finance"
  },
  {
    "id": "parent#dopex",
    "name": "Stryke",
    "url": "https://www.stryke.xyz/en",
    "description": "Stryke (previous Dopex) is a maximum liquidity and minimal exposure options protocol",
    "logo": "https://icons.llama.fi/stryke.jpg",
    "gecko_id": "stryke",
    "cmcId": "32215",
    "chains": [],
    "github": [
      "dopex-io",
      "stryke-xyz"
    ],
    "treasury": "dopex.js",
    "twitter": "stryke_xyz"
  },
  {
    "id": "parent#spool-protocol",
    "name": "Yelay Protocol",
    "url": "https://www.yelay.io/",
    "description": "Automatically optimize yield across the best DeFi platforms. Transform crypto yield into things your customers really want.",
    "logo": "https://icons.llama.fi/yelay-protocol.jpg",
    "gecko_id": "spool-dao-token",
    "cmcId": "18726",
    "chains": [],
    "github": [
      "SpoolFi"
    ],
    "treasury": "spool-protocol.js",
    "governanceID": [
      "snapshot:gov.spool.eth"
    ],
    "twitter": "YieldLayer"
  },
  {
    "id": "parent#gondi",
    "name": "Gondi",
    "url": "https://www.gondi.xyz",
    "description": "Borrow, Lend & Refinance NFTs on the most capital efficient lending protocol",
    "logo": "https://icons.llama.fi/gondi.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "gondixyz"
    ],
    "twitter": "gondixyz"
  },
  {
    "id": "parent#fuzion",
    "name": "Fuzion",
    "url": "https://dashboard.fuzion.app",
    "description": "Building on Kujira Blockchain, Connecting Capital with Ideas 1. Plasma - OTC Deals 2. Pilot - Launchpad and 3. Bonds - Capital Raising. Home of FUZN.",
    "logo": "https://icons.llama.fi/fuzion.png",
    "gecko_id": "fuzion",
    "cmcId": null,
    "chains": [],
    "twitter": "Fuzion_App"
  },
  {
    "id": "parent#deri",
    "name": "Deri",
    "url": "https://deri.io/#/index",
    "description": "Deri Protocol is a decentralized protocol for users to exchange risk exposures precisely and capital efficiently. It is the DeFi way to trade derivatives: to hedge, to speculate, to arbitrage, all on chain.",
    "logo": "https://icons.llama.fi/deri.png",
    "gecko_id": "deri-protocol",
    "cmcId": "8424",
    "chains": [],
    "treasury": "deri-protocol.js",
    "twitter": "DeriProtocol",
    "github": [
      "deri-protocol"
    ]
  },
  {
    "id": "parent#lighter",
    "name": "Lighter",
    "url": "https://lighter.xyz",
    "description": "Liquid digital assets traded the way they were meant to be with the fully decentralized order book exchange for spot trading on L2’s, now live on Arbitrum.",
    "logo": "https://icons.llama.fi/lighter.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Lighter_xyz"
  },
  {
    "id": "parent#dfx-finance",
    "name": "DFX Finance",
    "url": "https://app.dfx.finance",
    "description": "DFX is a decentralized foreign exchange protocol optimized for trading fiat-backed foreign stablecoins",
    "logo": "https://icons.llama.fi/dfx-finance.jpg",
    "gecko_id": "dfx-finance",
    "cmcId": "8666",
    "chains": [],
    "twitter": "DFXFinance",
    "governanceID": [
      "snapshot:dfx.eth"
    ],
    "github": [
      "dfx-finance"
    ]
  },
  {
    "id": "parent#ascent-exchange",
    "name": "Ascent Exchange",
    "url": "https://ascent.exchange/",
    "description": "Ascent: The Next-Gen Liquidity Layer on Horizen Eon",
    "logo": "https://icons.llama.fi/ascent-exchange.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AscentExchange",
    "github": [
      "ascent-exchange"
    ]
  },
  {
    "id": "parent#charm-finance",
    "name": "Charm Finance",
    "url": "https://www.charm.fi/",
    "description": "The Liquidity Super App. The easiest way to provide and manage liquidity",
    "logo": "https://icons.llama.fi/charm-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "CharmFinance",
    "github": [
      "charmfinance"
    ]
  },
  {
    "id": "parent#beta-finance",
    "name": "Beta Finance",
    "url": "https://www.betafinance.org/",
    "description": "Beta Finance is the permissionless money market for borrowing, lending, and shorting crypto assets",
    "logo": "https://icons.llama.fi/beta-finance.png",
    "gecko_id": "beta-finance",
    "cmcId": "11307",
    "chains": [],
    "twitter": "beta_finance"
  },
  {
    "id": "parent#buttonwood",
    "name": "Buttonwood",
    "url": "https://www.button.finance",
    "description": "Building DeFi's first Tranche Stablecoin & Poolside_Party, an AMM for Liquid Staking Tokens.",
    "logo": "https://icons.llama.fi/buttonwood.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ButtonDeFi",
    "github": [
      "buttonwood-protocol"
    ]
  },
  {
    "id": "parent#myswap",
    "name": "mySwap",
    "url": "https://www.myswap.xyz/",
    "description": "A decentralized exchange on top of StarkNet",
    "logo": "https://icons.llama.fi/myswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "mySwapxyz"
  },
  {
    "id": "parent#zebra",
    "name": "Zebra",
    "url": "https://zebra.xyz",
    "description": "A one-stop liquidity hub for the Scroll ecosystem",
    "logo": "https://icons.llama.fi/zebra.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ZebraProtocol",
    "github": [
      "zebra-xyz"
    ]
  },
  {
    "id": "parent#lynex",
    "name": "Lynex",
    "url": "https://app.lynex.fi",
    "description": "Linea's native on-chain liquidity marketplace. Powered by cutting-edge DEX infrastructure, it offers a highly capital-efficient DeFi solution",
    "logo": "https://icons.llama.fi/lynex.png",
    "gecko_id": "lynex",
    "cmcId": null,
    "chains": [],
    "twitter": "LynexFi"
  },
  {
    "id": "parent#xswap-protocol",
    "name": "XSwap Protocol",
    "url": "https://app.xspswap.finance/swap",
    "description": "XSWAP is the first decentralized exchange (DEX) that utilizes an automated market maker (AMM) system on the Xinfin network and is powered by XDC. The vision of XSWAP is to grow and expand the Xinfin network. It allows the swap and exchange of XRC20 tokens and offers staking & yield farming. XSwap is also home to the first launchpad in the XDC network which offers token creation, presale creation, token & liquidity locker and multisender for all XRC20 tokens.",
    "logo": "https://icons.llama.fi/xswap-protocol.png",
    "gecko_id": "xswap-protocol",
    "cmcId": "14613",
    "chains": [],
    "twitter": "XSwapProtocol",
    "github": [
      "XRC20-Swap"
    ]
  },
  {
    "id": "parent#lyra",
    "name": "Derive",
    "url": "https://derive.xyz",
    "description": "Trade options & perps. Earn yield with restaking derivatives.",
    "logo": "https://icons.llama.fi/derive.png",
    "gecko_id": "derive",
    "cmcId": null,
    "chains": [],
    "twitter": "derivexyz",
    "governanceID": [
      "snapshot:lyra.eth"
    ],
    "github": [
      "lyra-finance"
    ],
    "treasury": "lyra.js"
  },
  {
    "id": "parent#archly-finance",
    "name": "Archly Finance",
    "url": "https://archly.fi",
    "description": "Archly Finance is a liquidity solution for protocols on a wide range of EVM chains to properly incentivize liquidity for their own use cases.",
    "logo": "https://icons.llama.fi/archly-finance.png",
    "gecko_id": "archly-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "ArchlyFinance"
  },
  {
    "id": "parent#parcl",
    "name": "Parcl",
    "url": "https://www.parcl.co",
    "description": "Trade real estate prices with up to 10x leverage",
    "logo": "https://icons.llama.fi/parcl.jpg",
    "gecko_id": "parcl",
    "cmcId": "30661",
    "chains": [],
    "twitter": "Parcl"
  },
  {
    "id": "parent#balanceddao",
    "name": "Balanced",
    "url": "https://balanced.network/",
    "description": "Balanced is DeFi designed for adoption: it's fast, affordable, and easy to use. Home to the Balanced Dollar stablecoin (bnUSD) and a decentralised exchange, it uses ICON's cross-chain technology to connect to other blockchains. You can use Balanced to borrow bnUSD, swap assets, supply liquidity, and transfer cross-chain. The best part is, your crypto stays wrapper-free.",
    "logo": "https://icons.llama.fi/balanced.png",
    "gecko_id": "balance-tokens",
    "cmcId": null,
    "chains": [],
    "twitter": "BalancedDAO",
    "github": [
      "balancednetwork"
    ],
    "stablecoins": [
      "balanced-dollars"
    ]
  },
  {
    "id": "parent#baptswap",
    "name": "BaptSwap",
    "url": "https://baptswap.com",
    "description": "A protocol for trading and liquidity provision, an AMM with Fee-On-Transfer support on the Aptos Network",
    "logo": "https://icons.llama.fi/baptswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "baptswap",
    "github": [
      "BAPTSWAP"
    ]
  },
  {
    "id": "parent#yearn",
    "name": "Yearn",
    "url": "https://yearn.fi/",
    "description": "Yearn Finance is DeFi’s premier yield aggregator. Giving individuals, DAOs and other protocols a way to deposit digital assets and receive yield.",
    "logo": "https://icons.llama.fi/yearn.jpg",
    "gecko_id": "yearn-finance",
    "cmcId": "5864",
    "chains": [],
    "twitter": "yearnfi",
    "treasury": "yearn.js",
    "governanceID": [
      "snapshot:ybaby.eth",
      "snapshot:yearn"
    ],
    "github": [
      "iearn-finance",
      "yearn"
    ]
  },
  {
    "id": "parent#orion-protocol",
    "name": "Orion",
    "url": "https://orion.xyz",
    "description": "The Orion Protocol is an open source protocol that provides liquidity and token swaps through its suite of persistent smart contracts enabling a trustless and fully decentralized trading ecosystem. It connects and aggregates the orderbooks of the largest centralized and decentralized liquidity sources in the industry on the most popular networks to minimize price volatility and slippage and maximize security and accessibility.",
    "logo": "https://icons.llama.fi/orion.png",
    "gecko_id": "orion-protocol",
    "cmcId": "5631",
    "chains": [],
    "twitter": "BuildOnLumia",
    "github": [
      "orionprotocol"
    ]
  },
  {
    "id": "parent#idex",
    "name": "IDEX",
    "url": "https://idex.io/",
    "description": "The fastest, most secure decentralized exchange",
    "logo": "https://icons.llama.fi/idex.png",
    "gecko_id": "aurora-dao",
    "cmcId": "310",
    "chains": [],
    "twitter": "idexio",
    "github": [
      "idexio"
    ]
  },
  {
    "id": "parent#cega",
    "name": "Cega",
    "url": "https://app.cega.fi",
    "description": "Cega is a decentralized exotic derivatives protocol",
    "logo": "https://icons.llama.fi/cega.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "cega_fi"
  },
  {
    "id": "parent#squadswap",
    "name": "SquadSwap",
    "url": "https://squadswap.com/",
    "description": "SquadSwap is a DEX backed by the Squad NFT community and powered by the SQUAD token",
    "logo": "https://icons.llama.fi/squadswap.png",
    "gecko_id": "squadswap",
    "cmcId": "30069",
    "chains": [],
    "twitter": "squad_swap"
  },
  {
    "id": "parent#oath-foundation",
    "name": "Cod3x",
    "url": "https://www.cod3x.org/",
    "description": "The Cod3x ecosystem is designed to provide users of all skill levels access to the best DeFi yields and opportunities through its powerful agentic interface",
    "logo": "https://icons.llama.fi/cod3x.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Cod3xOrg"
  },
  {
    "id": "parent#ajna",
    "name": "Ajna Protocol",
    "url": "https://www.ajna.finance/",
    "description": "The Ajna Protocol is a noncustodial, peer-to-pool, permissionless lending, borrowing and trading system that requires no governance or external price feeds to function",
    "logo": "https://icons.llama.fi/ajna-protocol.png",
    "gecko_id": "ajna-protocol",
    "cmcId": "24862",
    "chains": [],
    "twitter": "ajnafi",
    "github": [
      "ajna-finance"
    ]
  },
  {
    "id": "parent#kim-exchange",
    "name": "KIM Exchange",
    "url": "https://kim.exchange",
    "description": "Native DEX for the Mode Network with staking modules to incentivize LPs",
    "logo": "https://icons.llama.fi/kim-exchange.jpg",
    "gecko_id": "kim-token",
    "cmcId": null,
    "chains": [],
    "twitter": "kimprotocol",
    "github": [
      "kizuna-dex"
    ]
  },
  {
    "id": "parent#swapr",
    "name": "Swapr",
    "url": "https://swapr.eth.limo/",
    "description": "A governance-enabled automated-market maker with adjustable fees, made by DXdao.",
    "logo": "https://icons.llama.fi/swapr.jpg",
    "gecko_id": "swapr",
    "cmcId": null,
    "chains": [],
    "twitter": "Swapr_dapp",
    "governanceID": [
      "snapshot:swpr.eth"
    ],
    "github": [
      "levelkdev"
    ]
  },
  {
    "id": "parent#dojoswap",
    "name": "Dojoswap",
    "url": "https://dojo.trading",
    "description": "A Native AMM Dex on Injective. Providing efficient trading and liquidity mining to the Injective ecosystem",
    "logo": "https://icons.llama.fi/dojoswap.png",
    "gecko_id": "dojo-token",
    "cmcId": "29102",
    "chains": [],
    "twitter": "Dojo_Swap"
  },
  {
    "id": "parent#meridian",
    "name": "Meridian",
    "url": "https://www.meridianfinance.net",
    "description": "Meridian is a non-custodial, decentralised financial trading platform that offers interest-free stable coin borrowing, leverage trading and zero slippage swaps all in one place. ",
    "logo": "https://icons.llama.fi/meridian.jpg",
    "gecko_id": "meridian-mst",
    "cmcId": null,
    "chains": [],
    "twitter": "MeridianFi",
    "github": [
      "MeridianDollar"
    ]
  },
  {
    "id": "parent#gammaswaplabs",
    "name": "GammaSwap Protocol",
    "url": "https://gammaswap.com/",
    "description": "A novel primitive for scaling DeFi liquidity through permissionless risk markets",
    "logo": "https://icons.llama.fi/gammaswaplabs.jpg",
    "gecko_id": "gammaswap",
    "cmcId": null,
    "chains": [],
    "twitter": "GammaSwapLabs",
    "github": [
      "gammaswap"
    ]
  },
  {
    "id": "parent#navi-protocol",
    "name": "NAVI Protocol",
    "url": "https://www.naviprotocol.io",
    "description": "NAVI offers over collateralized lending/borrowing for SUI, USDC, USDT, wETH and wBTC and supports features like isolated pool, flash loan and soon to come crosschain lending/borrowing.",
    "logo": "https://icons.llama.fi/navi-protocol.jpg",
    "gecko_id": "navi",
    "cmcId": "29296",
    "chains": [],
    "twitter": "navi_protocol",
    "github": [
      "naviprotocol"
    ]
  },
  {
    "id": "parent#dydx",
    "name": "dYdX",
    "url": "https://dydx.exchange",
    "description": "The most powerful open trading platform for crypto assets. Margin trade, borrow, and lend cryptocurrency.",
    "logo": "https://icons.llama.fi/dydx.jpg",
    "gecko_id": "dydx-chain",
    "cmcId": "28324",
    "chains": [],
    "twitter": "dYdX",
    "treasury": "dydx.js",
    "governanceID": [
      "snapshot:dydxgov.eth"
    ],
    "github": [
      "dydxfoundation",
      "dydxprotocol"
    ]
  },
  {
    "id": "parent#fringe-finance",
    "name": "Fringe Finance",
    "url": "https://fringe.fi",
    "description": "DeFi lending, borrowing & margin trading ecosystem",
    "logo": "https://icons.llama.fi/fringe.png",
    "gecko_id": "fringe-finance",
    "cmcId": "17456",
    "chains": [],
    "twitter": "fringefinance"
  },
  {
    "id": "parent#equation",
    "name": "Equation",
    "url": "https://equation.org",
    "description": "Equation is a decentralized perpetual contract built on Arbitrum. With its innovative BRMM model, Equation provides both traders and Liquidity Providers (LPs) with up to 100x leverage, enabling traders to establish larger and unrestricted positions while enhancing capital efficiency for LPs. It offers the industry's lowest maintenance margin rate at just 0.25%, thus significantly reducing liquidation risk.",
    "logo": "https://icons.llama.fi/equation.jpg",
    "gecko_id": "equation",
    "cmcId": "28346",
    "chains": [],
    "twitter": "EquationDAO",
    "github": [
      "EquationDAO"
    ]
  },
  {
    "id": "parent#jupiter",
    "name": "Jupiter",
    "url": "https://jup.ag",
    "description": "Best exchange in DeFi. Full stack ecosystem play focused on advancing the meta.",
    "logo": "https://icons.llama.fi/jupiter.jpg",
    "gecko_id": "jupiter-exchange-solana",
    "cmcId": "29210",
    "chains": [],
    "twitter": "JupiterExchange",
    "github": [
      "jup-ag"
    ]
  },
  {
    "id": "parent#tenderize",
    "name": "Tenderize",
    "url": "https://tenderize.me",
    "description": "Liquid Staking 2.0 - Liquid stake to your preferred validators, create your own LSTs and find liquidity through TenderSwa p",
    "logo": "https://icons.llama.fi/tenderize.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "tenderize_me",
    "github": [
      "Tenderize"
    ]
  },
  {
    "id": "parent#mint-club",
    "name": "Mint Club",
    "url": "https://mint.club",
    "description": "Mint Club is a smart token building platform that has no need to code and provides instant liquidity. Anyone can launch a smart token with just a few simple clicks.",
    "logo": "https://icons.llama.fi/mint-club.png",
    "gecko_id": "mint-club",
    "cmcId": "10977",
    "chains": [],
    "github": [
      "Steemhunt"
    ],
    "twitter": "MintClubPro"
  },
  {
    "id": "parent#lista-dao",
    "name": "Lista DAO",
    "url": "https://lista.org/",
    "description": "Lista DAO functions as the open-source decentralized stablecoin lending protocol powered by LSDfi. Users can undergo staking and liquid staking on Lista, as well as borrow lisUSD against a variety of decentralized collateral",
    "logo": "https://icons.llama.fi/lista-dao.png",
    "gecko_id": "lista",
    "cmcId": "21533",
    "chains": [],
    "github": [
      "lista-dao"
    ],
    "twitter": "lista_dao",
    "stablecoins": [
      "lista-usd"
    ]
  },
  {
    "id": "parent#hiveswap",
    "name": "HiveSwap",
    "url": "https://www.hiveswap.io/",
    "description": "Hiveswap is the No.1 swap in the Bitcoin ecosystem, providing liquidity services for assets in the Bitcoin ecosystem",
    "logo": "https://icons.llama.fi/hiveswap.png",
    "gecko_id": "hiveswap",
    "cmcId": null,
    "chains": [],
    "twitter": "hiveswap_io"
  },
  {
    "id": "parent#claystack",
    "name": "ClayStack",
    "url": "https://claystack.com",
    "description": "ClayStack is a decentralized liquid staking platform that enables you to unlock the liquidity of staked assets across multiple chains. You can stake your assets and use the issued staking derivatives across the DeFi ecosystem.",
    "logo": "https://icons.llama.fi/claystack.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ClayStack_HQ"
  },
  {
    "id": "parent#supswap",
    "name": "SupSwap",
    "url": "https://supswap.xyz",
    "description": "Supswap is Native Liquidity Layer for Mode Network with Capital Efficient AMM",
    "logo": "https://icons.llama.fi/supswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "SupswapXyz",
    "github": [
      "supswap"
    ]
  },
  {
    "id": "parent#beethoven-x",
    "name": "Beets",
    "url": "https://beets.fi",
    "description": "The Flagship LST Hub on Sonic. From seamless staking to earning real yield on LST-focused liquidity pools, beets is the ultimate destination for your liquid-staked tokens.",
    "logo": "https://icons.llama.fi/beets-sml.png",
    "gecko_id": "beethoven-x",
    "cmcId": "13244",
    "chains": [],
    "twitter": "beets_fi",
    "governanceID": [
      "snapshot:beets.eth"
    ],
    "treasury": "beethovenx.js",
    "github": [
      "beethovenxfi"
    ]
  },
  {
    "id": "parent#sturdy",
    "name": "Sturdy",
    "url": "https://sturdy.finance/",
    "description": "Sturdy is a first of its kind DeFi protocol for interest-free borrowing and high yield lending. Rather than charging borrowers interest, Sturdy stakes their collateral and passes the yield to lenders. This model changes the relationship between borrowers and lenders to make Sturdy the first positive-sum lending protocol.",
    "logo": "https://icons.llama.fi/sturdy.png",
    "gecko_id": "sturdy",
    "cmcId": "26403",
    "chains": [],
    "twitter": "SturdyFinance",
    "governanceID": [
      "snapshot:sturdyfi.eth"
    ],
    "github": [
      "sturdyfi"
    ]
  },
  {
    "id": "parent#ajira-pay",
    "name": "Ajira Pay Finance",
    "url": "https://ajirapay.finance/",
    "description": "Ajira Pay Finance is a Multichain Decentralized Web3 protocol for secure and seamless crypto payments.",
    "logo": "https://icons.llama.fi/ajira-pay-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ajiraPayDefi"
  },
  {
    "id": "parent#dragonswap",
    "name": "DragonSwap",
    "url": "https://dgswap.io",
    "description": "DragonSwap is a decentralized automated liquidity protocol.",
    "logo": "https://icons.llama.fi/dragonswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "dgswap",
    "github": [
      "dragon-swap-klaytn"
    ]
  },
  {
    "id": "parent#jediswap",
    "name": "JediSwap",
    "url": "https://jediswap.xyz",
    "description": "A community-led fully permissionless and composable AMM on Starknet by StarkWareLtd.",
    "logo": "https://icons.llama.fi/jediswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "JediSwap"
  },
  {
    "id": "parent#prisma",
    "name": "Prisma Finance",
    "url": "https://prismafinance.com",
    "description": "The end game for liquid staking tokens. A non-custodial and decentralized Ethereum LST-backed stablecoin.",
    "logo": "https://icons.llama.fi/prisma-finance.jpg",
    "gecko_id": "prisma-governance-token",
    "cmcId": "28335",
    "chains": [],
    "twitter": "PrismaFi",
    "github": [
      "prisma-fi"
    ]
  },
  {
    "id": "parent#secta-finance",
    "name": "Secta Finance",
    "url": "https://secta.finance/",
    "description": "Secta is a Linea-native decentralized exchange (DEX) and launchpad. It supports Uniswap V2 and V3 pools on the DEX and aims to be top interface into decentralized finance on Linea",
    "logo": "https://icons.llama.fi/secta-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "SectaFinance",
    "github": [
      "secta-finance"
    ]
  },
  {
    "id": "parent#satori-finance",
    "name": "Satori Finance",
    "url": "https://satori.finance",
    "description": "Expand your trading horizons on zkEVMs",
    "logo": "https://icons.llama.fi/satori-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "SatoriFinance",
    "github": [
      "satori-hq",
      "satoridao"
    ]
  },
  {
    "id": "parent#fixes-inscription",
    "name": "Fixes World",
    "url": "https://fixes.world",
    "description": "Fixes World provides multiple fungible token issuance, trading, staking, and governance services. It is driven by the inscription mechanism to enable underlying programmable features.",
    "logo": "https://icons.llama.fi/fixes-world.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "fixesWorld",
    "github": [
      "fixes-world"
    ]
  },
  {
    "id": "parent#ilend",
    "name": "iLend",
    "url": "https://ilend.xyz",
    "description": "The First Native Money Markets Protocol on Injective",
    "logo": "https://icons.llama.fi/ilend.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "iLendorg"
  },
  {
    "id": "parent#standard-protocol",
    "name": "Standard Protocol",
    "url": "https://standardweb3.com/",
    "description": "All-in-one DeFi app offering trading without slippage",
    "logo": "https://icons.llama.fi/standard-protocol.png",
    "gecko_id": "standard-protocol",
    "cmcId": "9251",
    "chains": [],
    "twitter": "standardweb3",
    "github": [
      "standardweb3"
    ]
  },
  {
    "id": "parent#crunchy-network",
    "name": "Crunchy Network",
    "url": "https://crunchy.network",
    "description": "Crunchy provides DeFi services and solutions on Tezos to projects, developers, and end users. We like to think of ourselves as a DeFi-as-a-Service (DaaS) platform. Crunchy is maintained by independent developers and is governed by CrDAO holders.",
    "logo": "https://icons.llama.fi/crunchy-network.png",
    "gecko_id": "crunchy-dao",
    "cmcId": "13438",
    "chains": [],
    "twitter": "CrunchyTez",
    "github": [
      "crunchy-network"
    ]
  },
  {
    "id": "parent#cyberblast",
    "name": "Cyberblast",
    "url": "https://cyberblast.io",
    "description": "Cyberblast, the pioneering native DEX on the Blast L2",
    "logo": "https://icons.llama.fi/cyberblast.jpg",
    "gecko_id": "cyberblast-token",
    "cmcId": null,
    "chains": [],
    "twitter": "CyberblastDex"
  },
  {
    "id": "parent#thruster",
    "name": "Thruster",
    "url": "https://app.thruster.finance",
    "description": "To Blast off, we need Thrust Blast_l2s core liquidity and fair launch DEX layer, backed by DeFi's best.",
    "logo": "https://icons.llama.fi/thruster.jpg",
    "gecko_id": "thruster",
    "cmcId": null,
    "chains": [],
    "twitter": "ThrusterFi"
  },
  {
    "id": "parent#monoswap",
    "name": "MonoSwap",
    "url": "https://www.monoswap.io",
    "description": "Native yield reimagined. Home of the impossibles on Blast_L2.",
    "logo": "https://icons.llama.fi/monoswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "monoswapio"
  },
  {
    "id": "parent#ring-protocol",
    "name": "Ring Protocol",
    "url": "https://ring.exchange/",
    "description": "Ring is a new era in Decentralized Exchange revolutionizing asset utilization",
    "logo": "https://icons.llama.fi/ring-protocol.png",
    "gecko_id": "ring-protocol",
    "cmcId": null,
    "chains": [],
    "twitter": "ProtocolRing",
    "github": [
      "RingProtocol"
    ]
  },
  {
    "id": "parent#moraswap",
    "name": "Moraswap",
    "url": "https://moraswap.com/exchange/swap#",
    "description": "Moraswap is a decentralized exchange (DEX) built on Solana's Neon EVM",
    "logo": "https://icons.llama.fi/moraswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "moraswap_amm",
    "github": [
      "moraswap"
    ]
  },
  {
    "id": "parent#arthswap",
    "name": "ArthSwap",
    "url": "https://app.arthswap.org",
    "description": "ArthSwap is a one-stop Defi protocol that aspires to be the main DEX on the Astar Networks.",
    "logo": "https://icons.llama.fi/arthswap.png",
    "gecko_id": "arthswap",
    "cmcId": null,
    "chains": [],
    "twitter": "arthswap",
    "github": [
      "ArthSwap"
    ]
  },
  {
    "id": "parent#nile-exchange",
    "name": "Nile Exchange",
    "url": "https://nile.build",
    "description": "Nile is a next-generation AMM designed to serve as Linea's central liquidity hub, combining the secure and battle-tested superiority of Uniswap v3 with a custom incentive engine, vote-lock governance model, and streamlined user experience.",
    "logo": "https://icons.llama.fi/nile-exchange.png",
    "gecko_id": "nile",
    "cmcId": null,
    "chains": [],
    "twitter": "NileExchange"
  },
  {
    "id": "parent#cleopatra-exchange",
    "name": "Cleopatra Exchange",
    "url": "https://cleo.exchange",
    "description": "Cleopatra is a next-generation AMM designed to serve as Mantle's central liquidity hub, combining the secure and battle-tested superiority of Uniswap v3 with a custom incentive engine, vote-lock governance model, and streamlined user experience.",
    "logo": "https://icons.llama.fi/cleopatra-exchange.png",
    "gecko_id": "cleopatra",
    "cmcId": null,
    "chains": [],
    "twitter": "CleopatraDEX"
  },
  {
    "id": "parent#pharaoh-exchange",
    "name": "Pharaoh Exchange",
    "url": "https://pharaoh.exchange",
    "description": "Pharaoh is a next-generation AMM designed to serve as Avalanche's central liquidity hub, combining the secure and battle-tested superiority of Uniswap v3 with a custom incentive engine, vote-lock governance model, and streamlined user experience.",
    "logo": "https://icons.llama.fi/pharaoh-exchange.png",
    "gecko_id": "pharaoh",
    "cmcId": null,
    "chains": [],
    "twitter": "PharaohExchange"
  },
  {
    "id": "parent#unilend",
    "name": "Unilend",
    "url": "https://unilend.finance",
    "description": "UniLend is a comprehensive permissionless DeFi protocol. Anyone can list any asset on UniLend to access decentralized trading, lending/borrowing, and the industry’s most cost-effective flash loans.",
    "logo": "https://icons.llama.fi/unilend.jpg",
    "gecko_id": "unlend-finance",
    "cmcId": "7412",
    "chains": [],
    "twitter": "UniLend_Finance",
    "github": [
      "UniLend"
    ]
  },
  {
    "id": "parent#cian-protocol",
    "name": "CIAN Protocol",
    "url": "https://cian.app",
    "description": "CIAN is an open automation platform for onchain applications that allows users to swiftly build, optimize and protect intricate strategies using unrivaled automation primitives",
    "logo": "https://icons.llama.fi/cian.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "CIAN_protocol",
    "github": [
      "cian-ai"
    ]
  },
  {
    "id": "parent#orchai",
    "name": "Orchai",
    "url": "https://orchai.io",
    "description": "Orchai - DeFi Orchestrator Powered by AI - provides a set of multiple protocols and features, which assist users not only in optimizing the asset flow but also in improving the management & investing strategy.",
    "logo": "https://icons.llama.fi/orchai.jpg",
    "gecko_id": "och",
    "cmcId": "30350",
    "chains": [],
    "twitter": "orchai_protocol"
  },
  {
    "id": "parent#sharpe-ai",
    "name": "Sharpe AI",
    "url": "https://www.sharpe.ai",
    "description": "Sharpe Magnum is a leveraged staking layer built on top of Lido stETH. Magnum functions as a staking optimizer, enhancing the capital efficiency of staking pools by leveraging staked assets via lending protocols and flashloans while keeping the same underlying guarantees.",
    "logo": "https://icons.llama.fi/sharpe-ai.jpg",
    "gecko_id": "sharpe-ai",
    "cmcId": null,
    "chains": [],
    "twitter": "SharpeLabs"
  },
  {
    "id": "parent#sanctum",
    "name": "Sanctum",
    "url": "https://www.sanctum.so",
    "description": "Sanctum is a new primitive built on Solana to power liquid staking and bring Solana into an infinite-LST future. Sanctum enables users that stake SOL natively or with a liquid staking token (LST) to tap into a powerful unified liquidity layer.",
    "logo": "https://icons.llama.fi/sanctum.jpg",
    "gecko_id": "sanctum-2",
    "cmcId": "32299",
    "chains": [],
    "twitter": "sanctumso"
  },
  {
    "id": "parent#hercules",
    "name": "Hercules",
    "url": "https://app.hercules.exchange",
    "description": "Modeled after the highly successful Camelot DEX project on Arbitrum, Hercules is a community-first, capital-efficient and flexible DEX developed with multiple tools to support the next generation of builders who look for sustainable liquidity in the Metis network.",
    "logo": "https://icons.llama.fi/hercules.png",
    "gecko_id": "hercules-token",
    "cmcId": null,
    "chains": [],
    "treasury": "hercules.js",
    "twitter": "TheHerculesDEX"
  },
  {
    "id": "parent#a51-finance",
    "name": "A51 Finance",
    "url": "https://a51.finance/",
    "description": "A51 offers a liquidity automation engine to enhance the trading and liquidity provisioning experience. The automation gear, including auto-rebalance, auto-exit and reinvest, liquidity distribution, and hedging, gives LPs fine-grained control over their liquidity, allowing them to dictate asset and risk management actions.",
    "logo": "https://icons.llama.fi/a51-finance.png",
    "gecko_id": "a51-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "A51_Fi",
    "github": [
      "Unipilot",
      "a51finance"
    ]
  },
  {
    "id": "parent#powercity",
    "name": "POWERCITY",
    "url": "https://powercity.io",
    "description": "POWERCITY is an ecosystem of projects designed to improve PulseChain for the community. All connected through its central CORE.",
    "logo": "https://icons.llama.fi/powercity.jpg",
    "gecko_id": "powercity-watt",
    "cmcId": null,
    "chains": [],
    "twitter": "POWERCITYio"
  },
  {
    "id": "parent#frogswap",
    "name": "Frogswap",
    "url": "https://frogswap.xyz",
    "description": "Swap, Trade & Earn on Degenchain",
    "logo": "https://icons.llama.fi/frogswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "FrogSwapETH"
  },
  {
    "id": "parent#marginx",
    "name": "MarginX",
    "url": "https://marginx.io",
    "description": "MarginX is a decentralised exchange (DEX) that enables crypto projects, traders and DeFi enthusiasts the freedom to list, trade and provide liquidity.",
    "logo": "https://icons.llama.fi/marginx.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "marginx_io"
  },
  {
    "id": "parent#fathom",
    "name": "Fathom",
    "url": "https://fathom.fi/",
    "description": "Fathom Protocol is a comprehensive DeFi platform providing liquidity solutions to both retail and institutional participants. Users can deposit XDC and staked XDC to mint FXD, USD stablecoin, which can be used to gain exposure to yield opportunities through our RWA Vaults and Trade Finance Pools. Crypto and RWA holders can also borrow FXD using their assets as collateral.",
    "logo": "https://icons.llama.fi/fathom.png",
    "gecko_id": "fathom-protocol",
    "cmcId": "29056",
    "chains": [],
    "twitter": "Fathom_fi",
    "stablecoins": [
      "fathom-dollar"
    ]
  },
  {
    "id": "parent#merchant-moe",
    "name": "Merchant Moe",
    "url": "https://merchantmoe.com/",
    "description": "Decentralized Trading powered by Mantle",
    "logo": "https://icons.llama.fi/merchant-moe.png",
    "gecko_id": "moe-3",
    "cmcId": "28852",
    "chains": [],
    "twitter": "MerchantMoe_xyz",
    "github": [
      "merchant-moe"
    ]
  },
  {
    "id": "parent#astaria",
    "name": "Astaria",
    "url": "https://astaria.xyz/",
    "description": "Astaria is a lending protocol that supports any ERC-20, ERC-1155, and ERC721. It enables users to create fixed-rate loans with unlimited durations",
    "logo": "https://icons.llama.fi/astaria.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AstariaXYZ",
    "github": [
      "AstariaXYZ"
    ]
  },
  {
    "id": "parent#ether-fi",
    "name": "ether.fi",
    "url": "https://app.ether.fi/",
    "description": "Decentralized and non-custodial Ethereum staking protocol",
    "logo": "https://icons.llama.fi/ether.fi.jpg",
    "gecko_id": "ether-fi",
    "cmcId": "29814",
    "chains": [],
    "twitter": "ether_fi",
    "github": [
      "etherfi-protocol"
    ],
    "governanceID": [
      "snapshot:etherfi-dao.eth"
    ]
  },
  {
    "id": "parent#kriyadex",
    "name": "Kriya",
    "url": "https://app.kriya.finance/",
    "description": "1-stop DeFi protocol on Sui. Offering Swaps, Limit Orders, 1-click leverage lending strategies, Yield Optimiser Vaults and 20x perpetuals",
    "logo": "https://icons.llama.fi/kriya.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "KriyaDEX",
    "github": [
      "efficacy-finance"
    ]
  },
  {
    "id": "parent#solidlizard",
    "name": "SolidLizard",
    "url": "https://solidlizard.finance/",
    "description": "Ve(3,3) DEX and Lending, pioneering Defi on Arbitrum",
    "logo": "https://icons.llama.fi/solidlizard.png",
    "gecko_id": "solidlizard",
    "cmcId": null,
    "chains": [],
    "twitter": "solidlizardfi",
    "governanceID": [
      "snapshot:solidlizardfinance.eth"
    ]
  },
  {
    "id": "parent#arcadia-finance",
    "name": "Arcadia Finance",
    "url": "https://arcadia.finance",
    "description": "Arcadia is a non-custodial protocol enabling composable cross-margin accounts on-chain. Margin account users can collateralize entire portfolios, access up to 10x more capital than their initial collateral value, and use their deposited collateral and the borrowed capital to permissionless interact with any other protocol from a single cross-margin account. Lenders supply assets to Arcadia's lending pools, earning passive yields for providing liquidity to margin account users.",
    "logo": "https://icons.llama.fi/arcadia-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ArcadiaFi",
    "github": [
      "arcadia-finance"
    ]
  },
  {
    "id": "parent#subseaprotocol",
    "name": "Karak Protocol",
    "url": "https://karak.network",
    "description": "Risk management marketplace for digital assets.",
    "logo": "https://icons.llama.fi/karak-protocol.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "governanceID": [
      "snapshot:riskharbor.eth"
    ],
    "github": [
      "Risk-Harbor"
    ],
    "twitter": "SubseaProtocol"
  },
  {
    "id": "parent#particle",
    "name": "Particle",
    "url": "https://app.particle.trade",
    "description": "Permissionless leverage trading protocol for any digital asset. Backed by Polychain built on Blast",
    "logo": "https://icons.llama.fi/particle.png",
    "gecko_id": "particle-trade",
    "cmcId": null,
    "chains": [],
    "twitter": "particle_trade"
  },
  {
    "id": "parent#hyperliquid",
    "name": "Hyperliquid",
    "url": "https://hyperliquid.xyz",
    "referralUrl": "https://app.hyperliquid.xyz/join/DEFILLAMAO",
    "description": "Hyperliquid is a decentralized perpetual exchange with best-in-class speed, liquidity, and price",
    "logo": "https://icons.llama.fi/hyperliquid.png",
    "gecko_id": "hyperliquid",
    "cmcId": "32196",
    "chains": [],
    "twitter": "HyperliquidX",
    "github": [
      "hyperliquid-dex"
    ]
  },
  {
    "id": "parent#wise-lending",
    "name": "Wise Lending",
    "url": "https://wiselending.com/",
    "description": "Wise Lending is both a crypto lending platform and a yield-farm aggregator. This combination allows capital from lenders to be leveraged towards other yield-farming dApps",
    "logo": "https://icons.llama.fi/wise-lending.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "WiseLending"
  },
  {
    "id": "parent#Edge",
    "name": "Vertex Edge",
    "url": "https://edge.vertexprotocol.com/",
    "description": "The Synchronous Orderbook Liquidity Layer unifying cross-chain liquidity in DeFi",
    "logo": "https://icons.llama.fi/vertex-edge.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "EdgeLayer",
    "github": [
      "vertex-protocol"
    ]
  },
  {
    "id": "parent#btcfi",
    "name": "BTCFi",
    "url": "https://btcfi.one",
    "description": "BTCFi is a decentralized crosschain Bitcoin asset management platform offering native Bitcoin collateralization to mint a Bitcoin-backed stablecoin, BtcUSD.",
    "logo": "https://icons.llama.fi/btcfi.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Bifrost_Network",
    "stablecoins": [
      "bitcoin-usd"
    ]
  },
  {
    "id": "parent#stationdex",
    "name": "StationDEX",
    "url": "https://stationdex.com/",
    "description": "StationDEX is a multi-chain decentralized exchange.",
    "logo": "https://icons.llama.fi/stationdex.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "StationDEX_",
    "github": [
      "station-dex"
    ]
  },
  {
    "id": "parent#abracadabra",
    "name": "Abracadabra",
    "url": "https://abracadabra.money",
    "description": "Abracadabra.money is a spell book that allows users to produce magic internet money ($MIM) which is a stable coin that you can swap for any other traditional stable coin.",
    "logo": "https://icons.llama.fi/abracadabra.jpg",
    "gecko_id": "spell-token",
    "cmcId": "11289",
    "chains": [],
    "twitter": "MIM_Spell",
    "governanceID": [
      "snapshot:abracadabrabymerlinthemagician.eth"
    ],
    "stablecoins": [
      "magic-internet-money"
    ],
    "treasury": "abracadabra.js",
    "github": [
      "Abracadabra-money"
    ]
  },
  {
    "id": "parent#aerodrome",
    "name": "Aerodrome",
    "url": "https://aerodrome.finance/",
    "description": "A central trading and liquidity marketplace on Base",
    "logo": "https://icons.llama.fi/aerodrome.png",
    "gecko_id": "aerodrome-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "aerodromefi",
    "github": [
      "aerodrome-finance"
    ]
  },
  {
    "id": "parent#rabbitx-fusion",
    "name": "RabbitX Fusion",
    "url": "https://rabbitx.io/",
    "description": "RabbitX is a global permissionless perpetuals and derivatives exchange built for traders. RabbitX is building the most secure and liquid global derivatives network, giving you 24/7 access to global markets anywhere in the world.",
    "logo": "https://icons.llama.fi/rabbitx-fusion.jpg",
    "gecko_id": "rabbitx",
    "cmcId": "24792",
    "chains": [],
    "twitter": "rabbitx_io"
  },
  {
    "id": "parent#atlendis",
    "name": "Atlendis",
    "url": "https://www.atlendis.io/",
    "description": "Atlendis Labs is redefining private credit in the digital age.",
    "logo": "https://icons.llama.fi/atlendis.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AtlendisLabs",
    "github": [
      "Atlendis"
    ]
  },
  {
    "id": "parent#fjord-foundry",
    "name": "Fjord Foundry",
    "url": "https://www.fjordfoundry.com",
    "description": "Connecting innovative projects and engaged backers through a community-focused platform, offering fair and transparent LBPs and token sale events.",
    "logo": "https://icons.llama.fi/fjord-foundry.jpg",
    "gecko_id": "fjord-foundry",
    "cmcId": null,
    "chains": [],
    "twitter": "FjordFoundry",
    "treasury": "fjord-foundry.js"
  },
  {
    "id": "parent#nuri-exchange",
    "name": "Nuri Exchange",
    "url": "https://www.nuri.exchange",
    "description": "Nuri is a next-generation AMM designed to serve as Scroll's central liquidity hub, combining the secure and battle-tested superiority of Uniswap v3 with a custom incentive engine, vote-lock governance model, and streamlined user experience.",
    "logo": "https://icons.llama.fi/nuri-exchange.jpg",
    "gecko_id": "nuri-exchange",
    "cmcId": null,
    "chains": [],
    "twitter": "NuriExchange"
  },
  {
    "id": "parent#inception",
    "name": "Inception",
    "url": "https://www.inceptionlrt.com/",
    "description": "Restake your Liquid Staked ETH for Layer 2 rewards while keeping it liquid",
    "logo": "https://icons.llama.fi/inception.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "InceptionLRT",
    "github": [
      "AmphorProtocol"
    ]
  },
  {
    "id": "parent#bitgenie",
    "name": "BitGenie",
    "url": "https://www.bitgenie.io/swap/",
    "description": "BitGenie is a one-stop shop for Ordinals, Runes, and other Bitcoin DeFi tools.",
    "logo": "https://icons.llama.fi/bitgenie.jpg",
    "gecko_id": "bitgenie",
    "cmcId": null,
    "chains": [],
    "twitter": "BitGenie_io"
  },
  {
    "id": "parent#sundaeswap",
    "name": "SundaeSwap",
    "url": "https://www.sundaeswap.finance/",
    "description": "The first native AMM-based decentralized exchange and liquidity provision protocol on Cardano.",
    "logo": "https://icons.llama.fi/sundaeswap.jpg",
    "gecko_id": "sundaeswap",
    "cmcId": "11986",
    "chains": [],
    "twitter": "SundaeSwap",
    "github": [
      "SundaeSwap-finance"
    ]
  },
  {
    "id": "parent#flowx-finance",
    "name": "FlowX Finance",
    "url": "https://flowx.finance/",
    "description": "FlowX Finance is the ecosystem-focused decentralized exchange built on the Sui Blockchain",
    "logo": "https://icons.llama.fi/flowx-finance.png",
    "gecko_id": "flowx-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "FlowX_finance"
  },
  {
    "id": "parent#keller-finance",
    "name": "Keller Finance",
    "url": "https://kellerfinance.app/",
    "description": "A DEX launched on Scroll",
    "logo": "https://icons.llama.fi/keller-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Equilibre_Labs"
  },
  {
    "id": "parent#vanillaswap",
    "name": "VanillaSwap",
    "url": "https://vanillalabs.org",
    "description": "We contribute to VanillaSwap - a protocol for trading and automated liquidity.",
    "logo": "https://icons.llama.fi/vanillaswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "VanillaSwap1"
  },
  {
    "id": "parent#cropper",
    "name": "Cropper",
    "url": "https://cropper.finance/",
    "description": "Cropper is an decentralized exchange built on the Solana blockchain.",
    "logo": "https://icons.llama.fi/cropper.png",
    "gecko_id": "cropperfinance",
    "cmcId": "11387",
    "chains": [],
    "twitter": "CropperFinance"
  },
  {
    "id": "parent#bitswap-bb",
    "name": "BitSwap BB",
    "url": "https://app.bouncebit.io/club/1",
    "description": "The Native BounceBit Swap for BTC L2 assets, built on bounce_bit",
    "logo": "https://icons.llama.fi/bitswap-bb.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "BitSwap_xyz"
  },
  {
    "id": "parent#verylongswap",
    "name": "VeryLongSwap",
    "url": "https://verylongswap.xyz",
    "description": "Permissionless AMM-based exchange that supercharges spot trades with concentrated liquidity within preferred price ranges.",
    "logo": "https://icons.llama.fi/verylongswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "VeryLong_Swap",
    "github": [
      "verylongswap"
    ]
  },
  {
    "id": "parent#ociswap",
    "name": "Ociswap",
    "url": "https://ociswap.com",
    "description": "Ociswap is a modular and highly configurable decentralized exchange (DEX) developed on the Radix Network.",
    "logo": "https://icons.llama.fi/ociswap.png",
    "gecko_id": "ociswap",
    "cmcId": null,
    "chains": [],
    "twitter": "ociswap"
  },
  {
    "id": "parent#9inch",
    "name": "9inch",
    "url": "https://www.9inch.io/",
    "description": "Staking and yield-farming for PulseChain & Ethereum",
    "logo": "https://icons.llama.fi/9inch.jpg",
    "gecko_id": "9inch",
    "cmcId": null,
    "chains": [],
    "twitter": "9inch_io"
  },
  {
    "id": "parent#tealswap",
    "name": "Tealswap",
    "url": "https://tealswap.com",
    "description": "Tealswap is a decentralized exchange with automated market maker on Oasys hub-layer.",
    "logo": "https://icons.llama.fi/tealswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "tealswap"
  },
  {
    "id": "parent#nimbora",
    "name": "Nimbora",
    "url": "https://www.nimbora.io/",
    "description": "Smooth sailing to 1-click DeFi. The best place to earn and borrow.",
    "logo": "https://icons.llama.fi/nimbora.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Nimbora_",
    "github": [
      "0xSpaceShard"
    ]
  },
  {
    "id": "parent#gullnetwork",
    "name": "GullNetwork",
    "url": "https://www.gullnetwork.com",
    "description": "GullNetwork, The trailblazing Layer 3 solution on Manta Network, transforming Defi with intuitive, codeless innovation and secure, equitable trading.",
    "logo": "https://icons.llama.fi/gullnetwork.jpg",
    "gecko_id": "gull",
    "cmcId": null,
    "chains": [],
    "twitter": "GullNetwork"
  },
  {
    "id": "parent#unlockd",
    "name": "Unlockd",
    "url": "https://unlockd.finance",
    "description": "Unlockd is the only permissionless protocol for Real World Assets liquidity that provides fair and secure instant loans powered by AI, requiring only a wallet.",
    "logo": "https://icons.llama.fi/unlockd.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Unlockd_Finance"
  },
  {
    "id": "parent#linehub",
    "name": "LineHub",
    "url": "https://linehub.io/",
    "description": "A one-stop DeFi Hub built exclusively on Linea chain.",
    "logo": "https://icons.llama.fi/linehub.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "LineDefiHub",
    "github": [
      "linedefi"
    ]
  },
  {
    "id": "parent#native",
    "name": "Native",
    "url": "https://native.org",
    "description": "Native is crypto's invisible DEX layer. Each DEX is owned by an individual project and embedded into that project's UI, with access to liquidity across the entire network.",
    "logo": "https://icons.llama.fi/native.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "native_fi"
  },
  {
    "id": "parent#pearlfi",
    "name": "PearlFi",
    "url": "https://www.pearl.exchange",
    "description": "The premiere ve(3,3) exchange for concentrated liquidity on tokenized RWAs and premium digital",
    "logo": "https://icons.llama.fi/pearlfi.jpg",
    "gecko_id": "pearl",
    "cmcId": null,
    "chains": [],
    "twitter": "PearlFi_"
  },
  {
    "id": "parent#koi-finance",
    "name": "Koi Finance",
    "url": "https://dapp.koi.finance",
    "description": "A lightning fast DEX, yield, and bond platform built on zkSync Era",
    "logo": "https://icons.llama.fi/koi-finance.png",
    "gecko_id": "koi-3",
    "cmcId": null,
    "chains": [],
    "twitter": "koi_finance",
    "governanceID": [
      "snapshot:mutegov.eth"
    ]
  },
  {
    "id": "parent#dtx",
    "name": "DTX",
    "url": "https://dtx.trade/",
    "description": "Unlike order book systems, DTX's unique synthetic architecture guarantees a seamless trading experience for traders by eliminating slippage and ensuring guaranteed order execution. Additionally, it offers flexibility in collateral usage and market-making while simultaneously maximizing capital efficiency for LPs.",
    "logo": "https://icons.llama.fi/dtx.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "0xDTX",
    "github": [
      "dtx-trade"
    ]
  },
  {
    "id": "parent#etcswap",
    "name": "ETCswap",
    "url": "https://etcswap.org",
    "description": "Swap, earn, and build on Ethereum Classic's leading decentralized crypto trading protocol.",
    "logo": "https://icons.llama.fi/etcswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ETCswap_org",
    "github": [
      "ethereumclassic"
    ]
  },
  {
    "id": "parent#blend",
    "name": "Blend",
    "url": "https://www.blend.capital",
    "description": "Blend is a modular liquidity protocol, allowing anyone to create flexible lending markets.",
    "logo": "https://icons.llama.fi/blend.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": null,
    "github": [
      "blend-capital"
    ]
  },
  {
    "id": "parent#spectra",
    "name": "Spectra",
    "url": "https://www.spectra.finance",
    "description": "Powered by open Interest Rates Derivatives Protocol",
    "logo": "https://icons.llama.fi/spectra.jpg",
    "gecko_id": "spectra-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "spectra_finance",
    "governanceID": [
      "snapshot:apwine.eth",
      "snapshot:spectradao.eth"
    ],
    "github": [
      "perspectivefi"
    ]
  },
  {
    "id": "parent#blasterswap",
    "name": "Blasterswap",
    "url": "https://blasterswap.com/",
    "description": "Uni v2 and v3 fork on blast",
    "logo": "https://icons.llama.fi/blasterswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "BlasterSwap"
  },
  {
    "id": "parent#anzen-finance",
    "name": "Anzen Finance",
    "url": "https://anzen.finance/",
    "description": "USDz is a digital dollar backed by institutional grade real world assets",
    "logo": "https://icons.llama.fi/anzen-finance.jpg",
    "gecko_id": "anzen-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "AnzenFinance"
  },
  {
    "id": "parent#bladeswap",
    "name": "BladeSwap",
    "url": "https://bladeswap.xyz",
    "description": "Blast native Dex with real-time vote reward & native multi-call",
    "logo": "https://icons.llama.fi/bladeswap.jpg",
    "gecko_id": "bladeswap",
    "cmcId": null,
    "chains": [],
    "github": [
      "Bladeswap"
    ],
    "twitter": "Bladeswapxyz"
  },
  {
    "id": "parent#maverick-protocol",
    "name": "Maverick Protocol",
    "url": "https://www.mav.xyz",
    "description": "The DeFi infrastructure built to bring higher capital efficiency + greater capital control to the liquidity market, powered by Maverick AMM.",
    "logo": "https://icons.llama.fi/maverick-protocol.jpg",
    "gecko_id": "maverick-protocol",
    "cmcId": "18037",
    "chains": [],
    "governanceID": [
      "snapshot:mavxyz.eth"
    ],
    "twitter": "mavprotocol"
  },
  {
    "id": "parent#mellow-protocol",
    "name": "Mellow Protocol",
    "url": "https://mellow.finance",
    "description": "Mellow Protocol is a permissionless system for active liquidity management and building trustless automatic DeFi strategies",
    "logo": "https://icons.llama.fi/mellow-protocol.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "mellowprotocol",
    "github": [
      "mellow-finance"
    ]
  },
  {
    "id": "parent#clober",
    "name": "Clober",
    "url": "https://clober.io",
    "description": "Clober is a fully decentralized on-chain order book DEX infrastructure based on its unique algorithm LOBSTER.",
    "logo": "https://icons.llama.fi/clober.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "CloberDEX",
    "github": [
      "clober-dex"
    ]
  },
  {
    "id": "parent#joltify-finance",
    "name": "Joltify Finance",
    "url": "https://joltify.io",
    "description": "The First EVM compatible game-changing L1 Public Chain built on the Cosmos SDK for Real-World Assets (RWA) and Beyond.",
    "logo": "https://icons.llama.fi/joltify-finance.jpg",
    "gecko_id": "joltify",
    "cmcId": null,
    "chains": [],
    "github": [
      "joltify-finance"
    ],
    "twitter": "joltify_finance"
  },
  {
    "id": "parent#macaron",
    "name": "Macaron",
    "url": "https://www.macaron.xyz",
    "description": "The First & Native DEX on bitlayerlabs, Yields & Liquidity for Users.",
    "logo": "https://icons.llama.fi/macaron.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "macarondex",
    "github": [
      "Macaromswap"
    ]
  },
  {
    "id": "parent#magicsea",
    "name": "MagicSea",
    "url": "https://magicsea.finance",
    "description": "Trade, Earn and Boost with the Power of IOTA",
    "logo": "https://icons.llama.fi/magicsea.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "MagicSeaDEX"
  },
  {
    "id": "parent#fenix-finance",
    "name": "Fenix Finance",
    "url": "https://www.fenixfinance.io",
    "description": "Fenix is an advanced decentralised exchange built for Blast",
    "logo": "https://icons.llama.fi/fenix-finance.jpg",
    "gecko_id": "fenix",
    "cmcId": null,
    "chains": [],
    "twitter": "FenixFinance"
  },
  {
    "id": "parent#netweave-finance",
    "name": "NetWeave Finance",
    "url": "https://www.netweave.finance",
    "description": "Focus on DeFi and strive to create convenient and secure lending protocols on Mode Network.",
    "logo": "https://icons.llama.fi/netweave-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "NetWeave_Fi"
  },
  {
    "id": "parent#icecreamswap",
    "name": "IcecreamSwap",
    "url": "https://icecreamswap.com",
    "description": "Uniswap v2 and v3 fork on CORE chain",
    "logo": "https://icons.llama.fi/icecreamswap.png",
    "gecko_id": "icecream",
    "cmcId": null,
    "chains": [],
    "twitter": "icecream_swap"
  },
  {
    "id": "parent#threshold-network",
    "name": "Threshold Network",
    "url": "https://threshold.network/",
    "description": "A decentralized threshold cryptography network",
    "logo": "https://icons.llama.fi/threshold-network.jpg",
    "gecko_id": "threshold-network-token",
    "cmcId": "17751",
    "chains": [],
    "twitter": "TheTNetwork",
    "github": [
      "threshold-network"
    ]
  },
  {
    "id": "parent#apex-protocol",
    "name": "ApeX Protocol",
    "url": "https://www.apex.exchange/",
    "description": "ApeX, an innovative derivatives protocol to provide Web3 users with a supreme derivatives trading experience",
    "logo": "https://icons.llama.fi/apex-protocol.png",
    "gecko_id": "apex-token-2",
    "cmcId": "19843",
    "chains": [],
    "twitter": "OfficialApeXdex",
    "github": [
      "ApeX-Protocol"
    ],
    "treasury": "apex-protocol.js"
  },
  {
    "id": "parent#affine-defi",
    "name": "Affine DeFi",
    "url": "https://app.affinedefi.com/",
    "description": "Risk research-backed Liquid Restaking and Earn products for maximizing yield",
    "logo": "https://icons.llama.fi/affine-defi.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AffineDeFi",
    "github": [
      "AffineLabs"
    ]
  },
  {
    "id": "parent#stargate-finance",
    "name": "Stargate Finance",
    "url": "https://stargate.finance/",
    "description": "Stargate is a fully composable liquidity transport protocol that lives at the heart of Omnichain DeFi. With Stargate, users & dApps can transfer native assets cross-chain while accessing the protocol’s unified liquidity pools with instant guaranteed finality.",
    "logo": "https://icons.llama.fi/affine-defi.png",
    "gecko_id": "stargate-finance",
    "cmcId": "18934",
    "chains": [],
    "twitter": "StargateFinance",
    "treasury": "stargate.js",
    "github": [
      "stargate-protocol"
    ]
  },
  {
    "id": "parent#desyn-protocol",
    "name": "DeSyn Protocol",
    "url": "https://www.desyn.io/#/",
    "description": "DeSyn is a decentralized liquidity infrastructure on Web3, empowering investors, projects, and security companies to invest, build, and manage collaboratively.",
    "logo": "https://icons.llama.fi/desyn-protocol.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "DesynLab",
    "github": [
      "Meta-DesynLab"
    ]
  },
  {
    "id": "parent#novaswap",
    "name": "NovaSwap",
    "url": "https://novaswap.fi",
    "description": "NovaSwap is an innovative multi-chain-assets aggregated AMM DEX built on zkLink Nova, offering ultimate security multi-layer yields and fair distribution.",
    "logo": "https://icons.llama.fi/novaswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "NovaSwap_fi"
  },
  {
    "id": "parent#friend-tech",
    "name": "friend.tech",
    "url": "https://www.friend.tech",
    "description": "Your network is your net worth.",
    "logo": "https://icons.llama.fi/friend.tech.jpg",
    "gecko_id": "friend-tech",
    "cmcId": "31056",
    "chains": [],
    "twitter": "friendtech"
  },
  {
    "id": "parent#glyph-exchange",
    "name": "Glyph Exchange",
    "url": "https://glyph.exchange",
    "description": "Glyph Exchange is a DEX for Bitcoin DeFi on the Core blockchain. The platform drives EVM liquidity to amplify Bitcoin-Powered crypto asset trading, connecting EVMs to Bitcoin Building Bitcoin-Fi on CoreDAO",
    "logo": "https://icons.llama.fi/glyph-exchange.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "glyph_exchange"
  },
  {
    "id": "parent#clearpool",
    "name": "Clearpool",
    "url": "https://clearpool.finance",
    "description": "Clearpool is a decentralized marketplace for unsecured institutional capital. It allows institutions to borrow funds from a decentralized network of lenders without the need for collateral.",
    "logo": "https://icons.llama.fi/clearpool.png",
    "gecko_id": "clearpool",
    "cmcId": "12573",
    "chains": [],
    "twitter": "ClearpoolFin",
    "github": [
      "clearpool-finance"
    ]
  },
  {
    "id": "parent#sparkdex",
    "name": "SparkDEX",
    "url": "https://sparkdex.ai/home",
    "description": "First AI-driven DeFi ecosystem on Flare Network.",
    "logo": "https://icons.llama.fi/sparkdex.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "SparkDexAI",
    "github": [
      "SparkDEX"
    ]
  },
  {
    "id": "parent#crust-finance",
    "name": "Crust Finance",
    "url": "https://www.crust.finance",
    "description": "Crust Finance is a decentralized exchange and automated market marker built on mantle blockchain focusing on providing efficient token swaps and deep liquidity for stablecoins and other assets",
    "logo": "https://icons.llama.fi/crust-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "CrustFinance"
  },
  {
    "id": "parent#bracket-protocol",
    "name": "Bracket Protocol",
    "url": "https://www.bracket.fi/",
    "description": "Bracket Is Liquid Staked DeFi. Backed By Binance Labs",
    "logo": "https://icons.llama.fi/bracket.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "bracket_fi"
  },
  {
    "id": "parent#cetus",
    "name": "Cetus",
    "url": "https://www.cetus.zone",
    "description": "Cetus is a pioneer DEX and concentrated liquidity protocol focusing on Move-based ecosystems like Aptos and Sui. It works as a crucial part of the ecosystem infrastructure to satisfy the comprehensive needs of traders, LPs, upper applications and an increasing DeFi population.",
    "logo": "https://icons.llama.fi/cetus.png",
    "gecko_id": "cetus-protocol",
    "cmcId": "25114",
    "chains": [],
    "twitter": "CetusProtocol"
  },
  {
    "id": "parent#fwx",
    "name": "FWX",
    "url": "https://fwx.finance/",
    "description": "FWX is an AMM-based leveraged swap platform that enables anyone to list tokens from the first days they are minted by simply providing liquidity.",
    "logo": "https://icons.llama.fi/fwx.jpg",
    "gecko_id": "be-for-fwx",
    "cmcId": null,
    "chains": [],
    "twitter": "fwxfinance",
    "treasury": "fwx.js"
  },
  {
    "id": "parent#poolz-finance",
    "name": "Poolz Finance",
    "url": "https://www.poolz.finance/",
    "description": "Poolz Finance is a decentralized open-source cross-chain launchpad platform built on top of Web 3.0 infrastructure to enable crypto projects to raise funds before listing",
    "logo": "https://icons.llama.fi/poolz-finance.png",
    "gecko_id": "poolz-finance-2",
    "cmcId": "8271",
    "chains": [],
    "twitter": "Poolz__",
    "github": [
      "The-Poolz"
    ]
  },
  {
    "id": "parent#pstake-finance",
    "name": "pSTAKE Finance",
    "url": "https://pstake.finance",
    "description": "pSTAKE Finance is a Bitcoin yield protocol, backed by Binance Labs. YBTC is a yield-optimized LST on top of Babylon’s BTC staking and can be used to get additional yields through Restaking and Liqudity Farming across the DeFi ecosystem.",
    "logo": "https://icons.llama.fi/pstake-finance.png",
    "gecko_id": "pstake-finance",
    "cmcId": "15996",
    "chains": [],
    "twitter": "pStakeFinance",
    "governanceID": [
      "snapshot:pstakefinance.eth"
    ]
  },
  {
    "id": "parent#dexalot",
    "name": "Dexalot",
    "url": "https://app.dexalot.com/",
    "description": "Dexalot is an omni-chain order book DEX with zero slippage, near zero gas fees, and is on its own app-specific chain, allowing users to deposit from and withdraw to multiple chains. Dexalot is also fully on-chain and non-custodial.",
    "logo": "https://icons.llama.fi/dexalot.png",
    "gecko_id": "dexalot",
    "cmcId": "18732",
    "chains": [],
    "twitter": "dexalot"
  },
  {
    "id": "parent#bmx",
    "name": "BMX",
    "url": "https://bmx.morphex.trade",
    "description": "BMX by Morphex is a decentralized perpetual exchange focused on bringing the highest capital efficiency to liquidity providers.",
    "logo": "https://icons.llama.fi/bmx.jpg",
    "gecko_id": "bmx",
    "cmcId": null,
    "chains": [],
    "twitter": "MorphexFTM"
  },
  {
    "id": "parent#unidex",
    "name": "UniDex",
    "url": "https://unidex.exchange",
    "description": "UniDex is a DeFi aggregation layer making interesting trading products such as leverage trading aggregation, derivatives, and other trading products.",
    "logo": "https://icons.llama.fi/unidex.jpg",
    "gecko_id": "unidex",
    "cmcId": "1058",
    "chains": [],
    "twitter": "UniDexFinance",
    "governanceID": [
      "snapshot:unidexapp.eth"
    ]
  },
  {
    "id": "parent#h2-finance",
    "name": "H2 Finance",
    "url": "https://h2.finance",
    "description": "Uniswap v2 and v3fork on Cronos zkEVM",
    "logo": "https://icons.llama.fi/h2-finance.png",
    "gecko_id": "h2",
    "cmcId": null,
    "chains": [],
    "twitter": "H2_Finance"
  },
  {
    "id": "parent#allbridge",
    "name": "Allbridge",
    "url": "https://app.allbridge.io",
    "description": "Allbridge Core enables the transfer of value between blockchains by offering cross-chain swaps of native stablecoins",
    "logo": "https://icons.llama.fi/allbridge-classic.png",
    "gecko_id": "allbridge",
    "cmcId": "12212",
    "chains": [],
    "twitter": "Allbridge_io",
    "github": [
      "allbridge-io"
    ]
  },
  {
    "id": "parent#brewlabs",
    "name": "Brewlabs",
    "url": "https://brewlabs.info/",
    "description": "Decentralized exchange on Polygon",
    "logo": "https://icons.llama.fi/brewlabs.png",
    "gecko_id": "brewlabs",
    "cmcId": "16405",
    "chains": [],
    "treasury": "brewlabs.js",
    "twitter": "TeamBrewlabs"
  },
  {
    "id": "parent#klayswap",
    "name": "KlaySwap",
    "url": "https://klayswap.com/dashboard",
    "description": "KLAYswap is an AMM-based Instant Swap Protocol",
    "logo": "https://icons.llama.fi/klayswap.jpg",
    "gecko_id": "klayswap-protocol",
    "cmcId": "8296",
    "chains": [],
    "twitter": "KLAYswap",
    "github": [
      "KlaySwap"
    ]
  },
  {
    "id": "parent#stakewise",
    "name": "StakeWise",
    "url": "https://stakewise.io/",
    "description": "Liquid staking for DeFi natives, solo stakers, and institutions on Ethereum and Gnosis Chain. Stake from any node & stay liquid with osETH & osGNO tokens",
    "logo": "https://icons.llama.fi/stakewise-v3.png",
    "gecko_id": "stakewise",
    "cmcId": "10439",
    "chains": [],
    "twitter": "stakewise_io",
    "governanceID": [
      "snapshot:stakewise.eth"
    ],
    "github": [
      "stakewise"
    ]
  },
  {
    "id": "parent#openworld",
    "name": "OpenWorld",
    "url": "https://ow.finance",
    "description": "OpenWorld Portfolio: Build a portfolio of high yielding, low risk liquidity pools with one click.",
    "logo": "https://icons.llama.fi/openworld.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "OpenWorldFi",
    "github": [
      "OpenWorldVision"
    ]
  },
  {
    "id": "parent#euler",
    "name": "Euler",
    "url": "https://www.euler.finance",
    "description": "Euler revolutionizes DeFi by letting any asset become collateral for a lending market. Lenders and borrowers get market leading risk-adjusted rates. Builders can create and manage markets exactly how they want them, with institutional-grade security.",
    "logo": "https://icons.llama.fi/euler.svg",
    "gecko_id": "euler",
    "cmcId": "14280",
    "chains": [],
    "twitter": "eulerfinance",
    "github": [
      "euler-xyz"
    ],
    "treasury": "euler.js",
    "governanceID": [
      "snapshot:eulerdao.eth"
    ]
  },
  {
    "id": "parent#drift",
    "name": "Drift",
    "url": "https://www.drift.trade/",
    "description": "Drift brings on-chain, cross-margined perpetual futures to Solana. Making futures DEXs the best way to trade.",
    "logo": "https://icons.llama.fi/drift-trade.jpg",
    "gecko_id": "drift-protocol",
    "cmcId": "31278",
    "chains": [],
    "twitter": "DriftProtocol",
    "github": [
      "drift-labs"
    ]
  },
  {
    "id": "parent#kayak",
    "name": "Kayak",
    "url": "https://kayakfinance.io",
    "description": "Enable traders to access aggregated liquidity, low-slippage swap with premium utility and yield",
    "logo": "https://icons.llama.fi/kayak.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Kayak_Finance"
  },
  {
    "id": "parent#echo-protocol",
    "name": "Echo Protocol",
    "url": "https://www.echo-protocol.xyz",
    "description": "Bridge, Restake and Earn Yield from BTC assets on Move",
    "logo": "https://icons.llama.fi/echo-protocol.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "EchoProtocol_"
  },
  {
    "id": "parent#mux-protocol",
    "name": "MUX Protocol",
    "url": "https://mux.network",
    "description": "MUX Protocol Suite contains the MUX Leveraged Trading Protocol and MUX Aggregator. MUX offers optimized trading cost, deep aggregated liquidity, diverse market options and a wide range of leverage options for traders.",
    "logo": "https://icons.llama.fi/mux-protocol.png",
    "gecko_id": "mcdex",
    "cmcId": "5956",
    "chains": [],
    "twitter": "muxprotocol",
    "governanceID": [
      "snapshot:muxvote.eth"
    ]
  },
  {
    "id": "parent#bonsaidao-ecosystem",
    "name": "BonsaiDAO Ecosystem",
    "url": "https://bonsaidao.xyz/",
    "description": "Bonsai DAO operates as a DeFi Studio inspired by the venture studio model, creating a scalable and adaptable ecosystem of interconnected products, known as Leaves",
    "logo": "https://icons.llama.fi/bonsaidao-ecosystem.png",
    "gecko_id": "bonsai",
    "cmcId": null,
    "chains": [],
    "twitter": "bonsai_dao",
    "github": [
      "UmamiDAO"
    ],
    "treasury": "bonsai.js",
    "governanceID": [
      "snapshot:arbis.eth",
      "snapshot:umamidao.eth"
    ]
  },
  {
    "id": "parent#modemax",
    "name": "ModeMax",
    "url": "https://modemax.io",
    "description": "Trade spot or perpetual BTC, ETH, MODE, USDT, USDC and other top cryptocurrencies with up to 50x leverage directly on ModeMax",
    "logo": "https://icons.llama.fi/modemax.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ModeMax_",
    "github": [
      "ModeMaxIO"
    ]
  },
  {
    "id": "parent#aevo",
    "name": "Aevo",
    "url": "https://www.aevo.xyz",
    "description": "Trade crypto options on the world's first high-performance decentralized options exchange.",
    "logo": "https://icons.llama.fi/aevo.jpg",
    "gecko_id": "aevo-exchange",
    "cmcId": "29676",
    "chains": [],
    "twitter": "aevoxyz",
    "github": [
      "aevoxyz"
    ]
  },
  {
    "id": "parent#dodo",
    "name": "DODO",
    "url": "https://dodoex.io",
    "description": "Trade crypto assets with market-leading liquidity",
    "logo": "https://icons.llama.fi/dodo.png",
    "gecko_id": "dodo",
    "cmcId": "7224",
    "chains": [],
    "twitter": "BreederDodo",
    "github": [
      "DODOEX"
    ],
    "governanceID": [
      "snapshot:dodobird.eth"
    ],
    "treasury": "dodo.js"
  },
  {
    "id": "parent#tokenlon",
    "name": "Tokenlon",
    "url": "https://tokenlon.im",
    "description": "Tokenlon is a decentralized exchange and payment settlement protocol based on blockchain technology",
    "logo": "https://icons.llama.fi/tokenlon.jpg",
    "gecko_id": "tokenlon",
    "cmcId": "856",
    "chains": [],
    "twitter": "tokenlon",
    "governanceID": [
      "snapshot:tokenlon.eth"
    ],
    "github": [
      "consenlabs"
    ]
  },
  {
    "id": "parent#dragon-swap",
    "name": "Dragon Swap",
    "url": "https://dragonswap.app",
    "description": "The DragonSwap Protocol is a publicly accessible, open-source framework designed for facilitating liquidity and enabling the trade of ERC20 tokens on the SEI EVM network. It bypasses the need for trusted middlemen and removes superfluous rent-seeking behavior, promoting secure, user-friendly, and efficient trading activities. This protocol is constructed to be permanent and non-upgradeable, ensuring it remains impervious to censorship.",
    "logo": "https://icons.llama.fi/dragon-swap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "dragonswap_dex",
    "github": [
      "dragonswap-app"
    ]
  },
  {
    "id": "parent#halotrade",
    "name": "HaloTrade",
    "url": "https://halotrade.zone/swap",
    "description": "The DEX on Aura Network",
    "logo": "https://icons.llama.fi/halotrade.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Halotradezone",
    "github": [
      "halotrade-zone"
    ]
  },
  {
    "id": "parent#demex",
    "name": "Demex",
    "url": "https://app.dem.exchange",
    "description": "The first fully decentralized DEX that supports any type of financial market.",
    "logo": "https://icons.llama.fi/demex.png",
    "gecko_id": null,
    "cmcId": "1240",
    "chains": [],
    "twitter": "demexchange"
  },
  {
    "id": "parent#helix",
    "name": "Helix",
    "url": "https://helixapp.com",
    "description": "The premier decentralized crypto exchange. Trade unlimited cross-chain spot and futures markets.",
    "logo": "https://icons.llama.fi/helix.jpg",
    "gecko_id": null,
    "cmcId": "1551",
    "chains": [],
    "twitter": "HelixApp_"
  },
  {
    "id": "parent#iguanadex",
    "name": "IguanaDEX",
    "url": "https://iguanadex.com",
    "description": "One-stop decentralized trading on Etherlink",
    "logo": "https://icons.llama.fi/iguanadex.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "iguanadex"
  },
  {
    "id": "parent#z-protocol",
    "name": "Z Protocol",
    "url": "https://iguanadex.com",
    "description": "One-stop decentralized trading on Etherlink",
    "logo": "https://icons.llama.fi/z-protocol.png",
    "gecko_id": "z-protocol",
    "cmcId": null,
    "chains": [],
    "twitter": "zprotocolxyz"
  },
  {
    "id": "parent#orderly-network",
    "name": "Orderly Network",
    "url": "https://orderly.network",
    "description": "Orderly is an omnichain CLOB infrastructure.It’s the ultimate trading lego for seamless integration by any builder on any blockchain. Give your app the transparency and composability of DEXs, with the speed and performance of CEXs.",
    "logo": "https://icons.llama.fi/orderly-network.jpg",
    "gecko_id": "orderly-network",
    "cmcId": "32809",
    "chains": [],
    "twitter": "OrderlyNetwork",
    "github": [
      "OrderlyNetwork"
    ]
  },
  {
    "id": "parent#level-finance",
    "name": "Level Finance",
    "url": "https://app.level.finance",
    "description": "Level Finance - Decentralized Perpetual Exchange.",
    "logo": "https://icons.llama.fi/level-finance.png",
    "gecko_id": "level",
    "cmcId": "23119",
    "chains": [],
    "twitter": "Level__Finance",
    "github": [
      "level-fi"
    ],
    "treasury": "level.js",
    "governanceID": [
      "snapshot:level-finance.eth"
    ]
  },
  {
    "id": "parent#swapline",
    "name": "Swapline",
    "url": "https://swapline.com",
    "description": "Swapline is a multichain DEX bringing the power of Liquidity Book AMM to new ecosystems. Experience trading with zero slippage.",
    "logo": "https://icons.llama.fi/swapline.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "SwaplineDEX"
  },
  {
    "id": "parent#avalon-labs",
    "name": "Avalon Labs",
    "url": "https://www.avalonfinance.xyz",
    "description": "The Liquidity Hub For BTC LSDFi and CeDeFi Lending",
    "logo": "https://icons.llama.fi/avalon-labs.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "avalonfinancexyz"
    ],
    "twitter": "avalonfinance_"
  },
  {
    "id": "parent#bouncebit-cedefi",
    "name": "BounceBit CeDeFi",
    "url": "https://portal.bouncebit.io/premium",
    "description": "BounceBit introduces a distinctive feature - the parallel generation of yield from both CeFi and DeFi. Users can earn original CeFi yield while utilizing LSD for BTC staking and on-chain farming, a process known as restaking in Bitcoin. This ecosystem offers three types of yield for Bitcoin holders: Original Cefi yield, node operation rewards from staking BTC on the BounceBit chain, and opportunity yield from participating in on-chain applications and the Bounce Launchpad.",
    "logo": "https://icons.llama.fi/bouncebit-cedefi.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "bounce_bit",
    "github": [
      "BounceBit-Labs"
    ]
  },
  {
    "id": "parent#fulcrom",
    "name": "Fulcrom",
    "url": "https://fulcrom.finance",
    "description": "Fulcrom is a decentralised perpetual exchange that allows users to trade leveraged positions with low fees and zero price impact, whilst having the peace of mind that all trades and collateral are stored transparently on-chain.",
    "logo": "https://icons.llama.fi/fulcrom.jpg",
    "gecko_id": "fulcrom",
    "cmcId": "24190",
    "chains": [],
    "twitter": "FulcromFinance"
  },
  {
    "id": "parent#superstate",
    "name": "Superstate",
    "url": "https://superstate.co",
    "description": "The Superstate Crypto Carry Fund (the “Fund”) offers Qualified Purchasers access to crypto basis (differential between the spot and future price) strategies. The Fund optimizes the yield and risk of crypto cash-and-carry trades across the Bitcoin basis, Ether basis (including staking Ether), and U.S. Treasury securities. ",
    "logo": "https://icons.llama.fi/superstate.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "superstatefunds",
    "github": [
      "superstateinc"
    ]
  },
  {
    "id": "parent#ktx.finance",
    "name": "KTX.Finance",
    "url": "https://www.ktx.finance",
    "description": "Trade and earn cryptocurrencies with lowest fees, depthless liquidity, and up to 50x leverage. Generate yield in a bull, bear, or sideways market.",
    "logo": "https://icons.llama.fi/ktx.finance.jpg",
    "gecko_id": "ktx-finance",
    "cmcId": "26493",
    "chains": [],
    "twitter": "KTX_finance"
  },
  {
    "id": "parent#logx",
    "name": "LogX",
    "url": "https://logx.network/",
    "description": "DeFi Superapp. Trade exotic perps, leveraged prediction markets and memecoins.",
    "logo": "https://icons.llama.fi/logx.jpg",
    "gecko_id": "logx-2",
    "cmcId": "33098",
    "chains": [],
    "twitter": "LogX_trade"
  },
  {
    "id": "parent#lombard-finance",
    "name": "Lombard Finance",
    "url": "https://www.lombard.finance",
    "description": "Lombard is transforming Bitcoin's utility from a store of value into a productive financial tool through a security-first liquid Bitcoin primitive—LBTC. LBTC is a liquid, yield-bearing, natively cross-chain, and 1:1 backed by bitcoin.",
    "logo": "https://icons.llama.fi/lombard-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Lombard_Finance"
  },
  {
    "id": "parent#ipor",
    "name": "IPOR Protocol",
    "url": "https://ipor.io",
    "description": "IPOR refers to a set of protocols, smart contracts, and software that forms a set of DApps for DeFi focused on interest rate derivatives",
    "logo": "https://icons.llama.fi/ipor-protocol.svg",
    "gecko_id": "ipor",
    "cmcId": "22880",
    "chains": [],
    "twitter": "ipor_io",
    "treasury": "ipor.js",
    "github": [
      "IPOR-Labs"
    ],
    "governanceID": [
      "snapshot:ipordao.eth"
    ]
  },
  {
    "id": "parent#electroswap",
    "name": "ElectroSwap",
    "url": "https://electroswap.io/",
    "description": "Decentralized Trading On The Electroneum Network",
    "logo": "https://icons.llama.fi/electroswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ElectroSwap_Dex"
  },
  {
    "id": "parent#cygnus-finance",
    "name": "Cygnus",
    "url": "https://cygnus.finance/",
    "description": "The First Modular Real Yield Layer.Provides services for any system that requires its own distributed validation, combining non-EVM systems with EVM ecosystem",
    "logo": "https://icons.llama.fi/cygnus-finance.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "arks-labs"
    ],
    "stablecoins": [
      "cygnus-finance-global-usd"
    ],
    "twitter": "CygnusFi"
  },
  {
    "id": "parent#typus-finance",
    "name": "Typus Finance",
    "url": "https://typus.finance",
    "description": "Typus Finance is a DeFi derivatives protocol on Sui Blockchain (Sui) that enables users to obtain superior risk-to-reward returns, all in one click.",
    "logo": "https://icons.llama.fi/typus-finance.jpg",
    "gecko_id": "typus",
    "cmcId": "34178",
    "chains": [
      "Sui"
    ],
    "github": [
      "Typus-Lab"
    ],
    "twitter": "TypusFinance",
    "treasury": "typus-finance.js",
    "address": "0xf82dc05634970553615eef6112a1ac4fb7bf10272bf6cbe0f80ef44a6c489385::typus::TYPUS"
  },
  {
    "id": "parent#bounceclub",
    "name": "BounceClub",
    "url": "https://club.bouncebit.io",
    "description": "BounceBit Club V2 is an holistic blockchain ecosystem on BounceBit Chain. It features Bitcoin integration, AI-powered trading tools, comprehensive DeFi primitives, meme token creation, and GameFi elements. Built on a secure foundation, it offers users a versatile platform to explore, create, and manage diverse blockchain applications through a user-friendly interface, catering to both novice and experienced crypto enthusiasts.",
    "logo": "https://icons.llama.fi/bounceclub.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "BounceBitClub"
  },
  {
    "id": "parent#stakestone",
    "name": "StakeStone",
    "url": "https://stakestone.io",
    "description": "One-Stop Staking Protocol For Omnichain LST Liquidity.",
    "logo": "https://icons.llama.fi/stakestone.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Stake_Stone"
  },
  {
    "id": "parent#onyx",
    "name": "Onyx",
    "url": "https://app.onyx.org/",
    "description": "Earn, borrow, and build with OnyxProtocol (prev. Chain) , a fully decentralized cross-token liquidity market powered by Onyxcoin (XCN) that supports NFTs and crypto.",
    "logo": "https://icons.llama.fi/onyx-protocol.jpg",
    "gecko_id": "Chain-2",
    "cmcId": "18679",
    "chains": [],
    "twitter": "OnyxDAO",
    "governanceID": [
      "snapshot:onyx.eth"
    ],
    "github": [
      "Onyx-Protocol"
    ]
  },
  {
    "id": "parent#delv",
    "name": "DELV",
    "url": "https://www.delv.tech",
    "description": "DELV (formerly Element Finance) is developing the complete suite of decentralized finance. Our protocols work together to help create the new financial system.",
    "logo": "https://icons.llama.fi/delv.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "delv_tech",
    "github": [
      "delvtech"
    ]
  },
  {
    "id": "parent#trado-finance",
    "name": "Trado Finance",
    "url": "https://perp.trado.one/",
    "description": "Trado Perpetual provides both order book and spot against pool trading models",
    "logo": "https://icons.llama.fi/trado-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "trado_one"
  },
  {
    "id": "parent#lisa-finance",
    "name": "LISA Finance",
    "url": "https://www.lisalab.io",
    "description": "The Goddess of Liquid Stacking, Brought to you by ALEX, Ryders Fast Pool, and Xverse Pool.",
    "logo": "https://icons.llama.fi/lisa-finance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "lisalab-io"
    ],
    "twitter": "LisaLab_BTC"
  },
  {
    "id": "parent#tonstakers",
    "name": "Tonstakers",
    "url": "https://tonstakers.com",
    "description": "The Open Network Liquid Staking protocol empowering TON DeFi ecosystem.",
    "logo": "https://icons.llama.fi/tonstakers.jpg",
    "gecko_id": "tonstakers",
    "cmcId": null,
    "chains": [],
    "twitter": "tonstakers"
  },
  {
    "id": "parent#kelp-dao",
    "name": "Kelp DAO",
    "url": "https://kelpdao.xyz/",
    "description": "The Kelp DAO team is currently building an LRT solution, rsETH, on EigenLayer for Ethereum",
    "logo": "https://icons.llama.fi/kelp-dao.png",
    "gecko_id": "kelp-dao",
    "cmcId": null,
    "chains": [],
    "twitter": "KelpDAO",
    "github": [
      "Kelp-DAO"
    ]
  },
  {
    "id": "parent#eddyfinance",
    "name": "EddyFinance",
    "url": "https://www.eddy.finance/",
    "description": "EddyFinance is a dex built on top of ZetaChain",
    "logo": "https://icons.llama.fi/eddyfinance.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "eddy_protocol"
  },
  {
    "id": "parent#lorenzo-protocol",
    "name": "Lorenzo Protocol",
    "url": "https://www.lorenzo-protocol.xyz",
    "description": "Lorenzo is the Bitcoin Liquidity Finance Layer, creates an efficient market in which Bitcoin holders can easily find the best opportunities to invest their unused Bitcoin liquidity and serves as the premier DeFi ecosystem in which to finance Bitcoin restaking tokens.",
    "logo": "https://icons.llama.fi/lorenzo-protocol.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "github": [
      "Lorenzo-Protocol"
    ],
    "twitter": "LorenzoProtocol"
  },
  {
    "id": "parent#capybara-exchange",
    "name": "Capybara Exchange",
    "url": "https://www.capybara.exchange",
    "description": "The 1st Launchpad & Decentralized Exchange on kaia chain. Hyper-capital-efficient, transparent, & community-first.",
    "logo": "https://icons.llama.fi/capybara-exchange.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "CapybaraDEX"
  },
  {
    "id": "parent#goldstation",
    "name": "GOLDSTATION",
    "url": "https://goldstation.io",
    "description": "GOLDSTATION is a comprehensive financial ecosystem designed to merge the real world of assets with the decentralized finance (DeFi) space, empowering users to seamlessly trade, invest, and manage a wide range of tokenized real assets.",
    "logo": "https://icons.llama.fi/goldstation.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "goldstation_io",
    "github": [
      "CrederLabs"
    ]
  },
  {
    "id": "parent#spookyswap",
    "name": "SpookySwap",
    "url": "https://spooky.fi",
    "description": "Community-driven, trader-focused DEX and DeFi Hub powered by $FTM with governance by $BOO.",
    "logo": "https://icons.llama.fi/spookyswap.jpg",
    "gecko_id": "spookyswap",
    "cmcId": "9608",
    "chains": [],
    "twitter": "SpookySwap",
    "treasury": "spookyswap.js",
    "governanceID": [
      "snapshot:spookyswap.eth"
    ],
    "github": [
      "SpookySwap"
    ]
  },
  {
    "id": "parent#hydro-protocol",
    "name": "HYDRO",
    "url": "https://app.hydroprotocol.finance",
    "description": "Ultimate LSD & LSDFi Infrastructure Platform on Injective",
    "logo": "https://icons.llama.fi/hydro-protocol.jpg",
    "gecko_id": "hydro-protocol-2",
    "cmcId": null,
    "chains": [],
    "twitter": "hydro_fi"
  },
  {
    "id": "parent#adrastea",
    "name": "Adrastea Finance",
    "url": "https://adrastea.fi",
    "description": "Adrastea is a composable leverage protocol that facilitates isolated boosting, with a primary mission to simplify the process and amplify the yield",
    "logo": "https://icons.llama.fi/adrastea.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AdrasteaFinance"
  },
  {
    "id": "parent#mimo",
    "name": "Mimo",
    "url": "https://mimo.exchange",
    "description": "Mimo is a decentralized liquidity protocol that will fuel the next wave of decentralized finance (DeFi) on IoTeX. mimo’s vision is to empower next-gen DeFi products that utilize our state-of-the-art automated liquidity protocol and the IoTeX's lightning-fast speed, low gas fees, and cross-chain capabilities.",
    "logo": "https://icons.llama.fi/mimo.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "mimoprotocol",
    "github": [
      "mimoprotocol"
    ]
  },
  {
    "id": "parent#deepbook",
    "name": "DeepBook",
    "url": "https://deepbook.tech",
    "description": "DeepBook is a fully on-chain central limit order book and the liquidity layer of Sui.",
    "logo": "https://icons.llama.fi/deepbook.jpg",
    "gecko_id": "deep",
    "cmcId": null,
    "chains": [],
    "twitter": "DeepBookonSui"
  },
  {
    "id": "parent#loxodrome",
    "name": "Loxodrome",
    "url": "https://loxodrome.xyz",
    "description": "Loxodrome is a pioneering DePIN-Focused Dex on the IoTeX, establishing itself as the first native liquidity marketplace focused on DePIN.",
    "logo": "https://icons.llama.fi/loxodrome.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "_Loxodrome"
  },
  {
    "id": "parent#bulbaswap",
    "name": "BulbaSwap",
    "url": "https://bulbaswap.io",
    "description": "BulbaSwap, the central trading and liquidity marketplace on MorphL2",
    "logo": "https://icons.llama.fi/bulbaswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "BulbaSwap"
  },
  {
    "id": "parent#suilend-protocol",
    "name": "Suilend Protocol",
    "url": "https://www.suilend.fi",
    "description": "Lending and borrowing platform on Sui",
    "logo": "https://icons.llama.fi/suilend.png",
    "gecko_id": "suilend",
    "cmcId": null,
    "chains": [],
    "twitter": "suilendprotocol"
  },
  {
    "id": "parent#fluid",
    "name": "Fluid",
    "url": "https://fluid.instadapp.io",
    "description": "An ever-evolving DeFi protocol and financial system of the future by Instadapp",
    "logo": "https://icons.llama.fi/fluid.png",
    "gecko_id": "instadapp",
    "cmcId": null,
    "chains": [],
    "twitter": "0xfluid"
  },
  {
    "id": "parent#solayer",
    "name": "Solayer",
    "url": "https://solayer.org",
    "description": "Solayer is the restaking protocol on Solana, securing both endogenous AVS (dApps) through stake-weighted quality of service and exogenous AVS via Solana-based POS primitives",
    "logo": "https://icons.llama.fi/solayer.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "solayer_labs"
  },
  {
    "id": "parent#swapmode",
    "name": "SwapMode",
    "url": "https://swapmode.fi",
    "description": "Premiere DEX on Mode, the native all in one hub for your liquidity",
    "logo": "https://icons.llama.fi/swapmode.png",
    "gecko_id": "swapmode",
    "cmcId": null,
    "chains": [],
    "twitter": "SwapModeFi",
    "github": [
      "swapmode"
    ]
  },
  {
    "id": "parent#superswap",
    "name": "SuperSwap",
    "url": "https://superswap.fi",
    "description": "SuperSwap, is the central liquidity network for the entire Superchain ecosystem, unifying chains - Optimism, Base, Mode, Fraxtal, Unichain, and more. Our mission is simple yet powerful: to bring together the diverse Superchain networks under one seamless, efficient liquidity system that caters to all your trading and liquidity needs.",
    "logo": "https://icons.llama.fi/superswap.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "SuperSwapFi"
  },
  {
    "id": "parent#ocelex",
    "name": "Ocelex",
    "url": "https://www.ocelex.fi",
    "description": "Zircuit's intrinsic on-chain liquidity marketplace. Driven by state-of-the-art DEX infrastructure, we present an exceptionally efficient DeFi solution.",
    "logo": "https://icons.llama.fi/ocelex.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "OcelexFi"
  },
  {
    "id": "parent#astherus",
    "name": "Astherus",
    "url": "https://astherus.com",
    "description": "Astherus is a liquidity hub for staked assets such as LSTs (liquid staking tokens) and LRTs (liquid restaking tokens), aiming to scale their utilization and boost user profitability.",
    "logo": "https://icons.llama.fi/astherus.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "AstherusHub"
  },
  {
    "id": "parent#zkswap-finance",
    "name": "zkSwap Finance",
    "url": "https://zkswap.finance",
    "description": "zkSwap Finance is the top DEX and the first Swap to Earn DeFi AMM on zkSync Era ecosystem, pioneering a unique incentive model that rewards both liquidity providers & traders",
    "logo": "https://icons.llama.fi/zkswap-finance.jpg",
    "gecko_id": "zkswap-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "zkSwap_finance",
    "github": [
      "ZkSwapFinance"
    ]
  },
  {
    "id": "parent#weft-finance",
    "name": "Weft Finance",
    "url": "https://app.weft.finance",
    "description": "Weft Finance is a decentralized lending and borrowing application built on Radix DLT",
    "logo": "https://icons.llama.fi/weft-finance.jpg",
    "gecko_id": "weft-finance",
    "cmcId": null,
    "chains": [],
    "twitter": "Weft_Finance",
    "github": [
      "WeftFinance"
    ]
  },
  {
    "id": "parent#degenhive",
    "name": "DegenHive",
    "url": "https://www.degenhive.ai",
    "description": "DegenHive is a gamified meta-DEX and liquid staking platform where users can collect, breed and battle with dragon-bees while earning protocol rewards. Users can lock their dragon-bees to redirect HIVE and HONEY incentives to AMM pools, claim bribes, and shape the ecosystem in a fun and interactive way.",
    "logo": "https://icons.llama.fi/degenhive.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "DegenHive"
  },
  {
    "id": "parent#bluefin",
    "name": "Bluefin",
    "url": "https://bluefin.io",
    "description": "Bluefin is a decentralized spot and derivatives exchange built for both professional and first-time traders. It focuses on security, transparency and redefining the user experience of using on-chain trading platforms - and is backed by Polychain, SIG, Brevan Howard, and other leading firms.",
    "logo": "https://icons.llama.fi/bluefin.png",
    "gecko_id": "bluefin",
    "cmcId": "8724",
    "chains": [],
    "twitter": "bluefinapp",
    "github": [
      "fireflyprotocol"
    ]
  },
  {
    "id": "parent#9mm",
    "name": "9MM Pro",
    "url": "https://9mm.pro/",
    "description": "9MM Pro is a suite of user-friendly protocols designed to revolutionize the decentralized finance (DeFi) landscape across multiple blockchains",
    "logo": "https://icons.llama.fi/9mm.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "9mm_pro"
  },
  {
    "id": "parent#ubeswap",
    "name": "Ubeswap",
    "url": "https://ubeswap.org",
    "description": "Ubeswap is the leading DEX on Celo network",
    "logo": "https://icons.llama.fi/ubeswap.png",
    "gecko_id": "ubeswap",
    "cmcId": "1339",
    "chains": [],
    "twitter": "ubeswap",
    "github": [
      "Ubeswap"
    ]
  },
  {
    "id": "parent#compx",
    "name": "Compx",
    "url": "https://www.compx.io/",
    "description": "Compx is providing a one stop DeFi platform, providing a comprehensive suite of DeFi tools under the one roof",
    "logo": "https://icons.llama.fi/compx.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "Compxlabs",
    "github": [
      "compx-labs"
    ]
  },
  {
    "id": "parent#zklend-finance",
    "name": "zkLend Finance",
    "url": "https://zklend.com/",
    "description": "zkLend is an L2 money-market protocol built on StarkNet, combining zk-rollup scalability, superior transaction speed, and cost-savings with Ethereum's security. The protocol offers a dual solution: a permissioned and compliance-focused solution for institutional clients, and a permissionless service for DeFi users - all without sacrificing decentralisation",
    "logo": "https://icons.llama.fi/zklend-finance.png",
    "gecko_id": "zklend-2",
    "cmcId": "18990",
    "chains": [],
    "twitter": "zkLend"
  },
  {
    "id": "parent#resolv",
    "name": "Resolv",
    "url": "https://resolv.xyz/",
    "description": "Resolv is a protocol that maintains USR, a stablecoin fully backed by ETH and pegged to the US Dollar. The stablecoin’s delta-neutral design ensures price stability, and is backed by an innovative insurance pool (RLP) to provide additional security and overcollateralization.",
    "logo": "https://icons.llama.fi/resolv.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ResolvLabs",
    "github": [
      "resolv-im"
    ],
    "stablecoins": [
      "resolv-usd"
    ]
  },
  {
    "id": "parent#plunderswap",
    "name": "PlunderSwap",
    "url": "https://plunderswap.com/swap",
    "description": "PlunderSwap is the first decentralized exchange on Zilliqa EVM",
    "logo": "https://icons.llama.fi/plunderswap.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "plunderswap",
    "github": [
      "Plunderswap"
    ]
  },
  {
    "id": "parent#thetis-market",
    "name": "Thetis Market",
    "url": "https://thetis.market",
    "description": "The pioneer ALL-IN-ONE DEX Aggregator, Perpetual Trading DEX and Liquidity Bootstrapping Pools on Aptos",
    "logo": "https://icons.llama.fi/thetis-market.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "ThetisMarket",
    "github": [
      "thetis-market"
    ]
  },
  {
    "id": "parent#holdstation",
    "name": "Holdstation",
    "url": "https://holdstation.com/",
    "description": "Wallet for Futures Trading & #AiAgents on ZKsync, Berachain & Worldcoin",
    "logo": "https://icons.llama.fi/holdstation.jpg",
    "gecko_id": "holdstation",
    "cmcId": "28510",
    "chains": [],
    "twitter": "HoldstationW"
  },
  {
    "id": "parent#okx-dex",
    "name": "OKX DEX",
    "url": "https://www.okx.com/web3/dex-swap",
    "description": "Freely choose trading routes from all major DEX aggregators, while X Routing continues to find the best quotes across 400+ DEXs and 30+ networks.",
    "logo": "https://icons.llama.fi/okx-dex.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "okx"
  },
  {
    "id": "parent#mars-protocol",
    "name": "Mars Protocol",
    "url": "https://marsprotocol.io",
    "description": "Mars is a multichain credit protocol enabling borrowing and lending primitives in the Cosmos. With Mars v2, the protocol introduced Rover credit accounts to Osmosis. Much like Binance subaccounts, credit accounts act as transferrable NFT containers where users can deposit assets, and use them as collateral for borrowing, spot or margin trading, leveraged yield farming, and hedging — all with a single liquidation point",
    "logo": "https://icons.llama.fi/mars-protocol.png",
    "gecko_id": "mars-protocol",
    "cmcId": "18621",
    "chains": [],
    "twitter": "mars_protocol",
    "github": [
      "mars-protocol"
    ]
  },
  {
    "id": "parent#metropolis-exchange",
    "name": "Metropolis Exchange",
    "url": "https://metropolis.exchange/",
    "description": "Metropolis is a Liquidity Book DLMM DEX native to Sonic, offering zero-slippage trades and higher yields for liquidity providers.",
    "logo": "https://icons.llama.fi/metropolis-exchange.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "MetropolisDEX"
  },
  {
    "id": "parent#ethena",
    "name": "Ethena",
    "url": "https://www.ethena.fi/",
    "description": "Ethena is a synthetic dollar protocol built on Ethereum",
    "logo": "https://icons.llama.fi/ethena.png",
    "gecko_id": "ethena",
    "cmcId": "30171",
    "chains": [],
    "twitter": "ethena_labs",
    "github": [
      "ethena-labs"
    ],
    "stablecoins": [
      "ethena-usde"
    ]
  },
  {
    "id": "parent#alphafi",
    "name": "AlphaFi",
    "url": "https://alphafi.xyz",
    "description": "Premier Yield Optimizer on the SUI Blockchain. Earn Safe, Real Yields with AlphaFi.",
    "logo": "https://icons.llama.fi/alphafi.jpg",
    "gecko_id": "alpha-fi",
    "cmcId": "32745",
    "chains": [],
    "twitter": "AlphaFiSUI",
    "github": [
      "AlphaFiTech"
    ]
  },
  {
    "id": "parent#sonic-market",
    "name": "Sonic Market",
    "url": "https://www.sonic.market",
    "description": "Sonic Market is a fully on-chain orderbook DEX protocol built on Sonic, offering instant settlement and trustless trading in a decentralized environment. By leveraging the composability of on-chain infrastructure, it integrates seamlessly with third-party protocols for advanced trading strategies. It provides a highly efficient and customizable trading experience through its innovative use of on-chain central limit orderbooks.",
    "logo": "https://icons.llama.fi/sonic-market.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "sonic_market"
  },
  {
    "id": "parent#bucket-protocol",
    "name": "Bucket Protocol",
    "url": "https://bucketprotocol.io",
    "description": "Bucket Protocol is the leading Collateralized Debt Position (CDP) protocol within the Sui ecosystem, supporting multiple assets for collateralization while extending stablecoin loans in $BUCK at a fixed low-cost. Its real-time liquidation mechanism ensures both security and capital efficiency, and the inbuilt flash loan services facilitate the price stability of the stablecoin BUCK.",
    "logo": "https://icons.llama.fi/bucket-protocol.jpg",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "bucket_protocol",
    "stablecoins": [
      "bucket-protocol-buck-stablecoin"
    ]
  },
  {
    "id": "parent#goblins-cash",
    "name": "Goblins Cash",
    "url": "https://bucketprotocol.io",
    "description": "Goblins.Cash is the first decentralized reserve currency protocol on SmartBCH with focus on bonds and elastic supply cryptocurrencies.",
    "logo": "https://icons.llama.fi/goblins-cash.png",
    "gecko_id": null,
    "cmcId": null,
    "chains": [],
    "twitter": "GoblinsCash",
    "treasury": "goblinscash.js"
  },
  {
    "id": "parent#extra-finance",
    "name": "Extra Finance",
    "url": "https://extrafi.io/",
    "description": "Extra Finance is a community-driven lending & leveraged yield farming protocol built on Optimism.",
    "logo": "https://icons.llama.fi/extra-finance.jpg",
    "gecko_id": "extra-finance",
    "cmcId": "27603",
    "chains": [],
    "twitter": "extrafi_io"
  },
  {
    "id": "parent#nirvana",
    "name": "Nirvana",
    "url": "https://www.nirvana.finance/",
    "description": "ANA is a partially-collateralized asset with a built-in rising floor price & renewable yield. It allows for zero liquidation risk loans in the form of the NIRV superstable token.",
    "logo": "https://icons.llama.fi/extra-finance.jpg",
    "gecko_id": "nirvana-ana",
    "cmcId": "19513",
    "chains": [],
    "twitter": "nirvana_fi"
  }
];

export default parentProtocols;

export const parentProtocolsById = parentProtocols.reduce((accum, protocol) => {
  accum[protocol.id] = protocol;
  return accum;
}, {} as Record<string, IParentProtocol>);