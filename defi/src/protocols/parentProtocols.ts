import { baseIconsUrl } from "../constants";
import type { IParentProtocol } from "./types";

/*
    leave `chains` and `category` as an empty array because we fill them based on their child protocols chains and category in api response
*/

const parentProtocols: IParentProtocol[] = [
  {
    id: "AAVE",
    name: "AAVE",
    url: "https://aave.com\r\n",
    description:
      "Aave is an Open Source and Non-Custodial protocol to earn interest on deposits and borrow assets",
    logo: `${baseIconsUrl}/aave-v2.png`,
    chains: [],
    gecko_id: "aave",
    cmcId: "7278",
    twitter: "AaveAave",
    governanceID: ["snapshot:aave.eth"],
  },
  {
    id: "Sushi",
    name: "Sushi",
    url: "https://sushi.com/",
    description:
      "A fully decentralized protocol for automated liquidity provision on Ethereum.\r\n",
    logo: `${baseIconsUrl}/sushi.jpg`,
    gecko_id: "sushi",
    cmcId: "6758",
    chains: [],
    twitter: "SushiSwap",
    governanceID: ["snapshot:sushigov.eth"]
  },
  {
    id: "SUN.io",
    name: "SUN",
    url: "https://sun.io",
    description:
      "First integrated platform for stablecoin swap, stake-mining, and self-governance on TRON",
    logo: `${baseIconsUrl}/sun.jpg`,
    gecko_id: "sun-token",
    cmcId: "10529",
    chains: [],
    twitter: "defi_sunio",
  },
  {
    id: "Benqi",
    name: "Benqi",
    url: "https://benqi.fi",
    description:
      "BENQI is a non-custodial liquidity market protocol, built on Avalanche. The protocol enables users to effortlessly lend, borrow, and earn interest with their digital assets.",
    logo: `${baseIconsUrl}/benqi-lending.jpg`,
    gecko_id: "benqi",
    cmcId: "9288",
    chains: [],
    twitter: "BenqiFinance",
  },
  {
    id: "incrementFinance",
    name: "Increment Finance",
    url: "https://increment.fi",
    description:
      "Increment Finance, One-stop DeFi Platform on Flow Blockchain.",
    logo: `${baseIconsUrl}/increment-lending.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "incrementfi",
  },
  {
    id: "podsFinance",
    name: "Pods",
    url: "https://www.pods.finance/",
    description:
      "Buliding DeFi, Strategies, primitives and tooling. Welcome to Pods.",
    logo: `${baseIconsUrl}/pods-finance.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "PodsFinance",
    governanceID: ["snapshot:podsfinance.eth"]
  },
  {
    id: "ApeSwap",
    name: "ApeSwap",
    url: "https://apeswap.finance",
    description:
      "ApeSwap is a Decentralized Autonomous Organization (DAO) that offers a full suite of tools to explore and engage with decentralized finance opportunities. Using the products within our DeFi Hub, users and partners can tap into this new wave of financial innovation in a secure, transparent, and globally accessible way",
    logo: `${baseIconsUrl}/apeswap.png`,
    gecko_id: "apeswap-finance",
    cmcId: "8497",
    chains: [],
    twitter: "ape_swap",
    governanceID: ["snapshot:apeswap-finance.eth"]
  },
  {
    id: "Parallel DeFi Super App",
    name: "Parallel DeFi Super App",
    url: "https://parallel.fi",
    description:
    "Parallel Finance is a Decentralized Money Market Protocol that offers lending, staking, and borrowing in the Polkadot ecosystem. Depositors can lend and stake simultaneously to earn double yield on their staked coins, and borrowers can collateralize to borrow.",
    logo: `${baseIconsUrl}/parallel-defi-super-app.jpg`,
    gecko_id: "parallel-finance" ,
    cmcId: "12887",
    chains: [],
    twitter: "ParallelFi",
  },
  {
    id: "Value Finance",
    name: "Value Finance",
    url: "https://valuedefi.io",
    description:
    "The Value DeFi protocol is a platform and suite of products that aim to bring fairness, true value, and innovation to Decentralized Finance.`",
    logo: `${baseIconsUrl}/value finance.png`,
    gecko_id: "value-liquidity" ,
    cmcId: "1183",
    chains: [],
    twitter: "value_defi",
  },
  {
    id: "Magik Finance",
    name: "Magik Finance",
    url: "https://magik.finance/",
    description:
    "Yield Optimization as a Service and Algorithmic token pegged to $FTM on the Fantom Opera network.",
    logo: `${baseIconsUrl}/magik-finance.png`,
    gecko_id: "magik",
    cmcId: "17941",
    chains: [],
    twitter: "MagikDotFinance",
  },
  {
    id: "Huckleberry",
    name: "Huckleberry",
    url: "https://www.huckleberry.finance/",
    description:
    "Huckleberry is a community driven AMM crosschain DEX and lendin' platform built on Moonriver and CLV.",
    logo: `${baseIconsUrl}/huckleberry.png`,
    gecko_id: "huckleberry",
    cmcId: "12922",
    chains: [],
    twitter: "HuckleberryDEX",
    governanceID: ["snapshot:huckleberrydex.eth"]
  },
  {
    id: "MM Finance",
    name: "MM Finance",
    url: "https://linktr.ee/madmeerkat",
    description:
    "DeFi Ecosystem on Cronos and AMM on Polygon",
    logo: `${baseIconsUrl}/mm-finance.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "MMFcrypto",
    governanceID: ["snapshot:mmfinance.eth"]
  },
  {
    id: "Mycelium",
    name: "Mycelium",
    url: "https://mycelium.xyz",
    description:
    "Previously Tracer DAO. Trade with liquidity, leverage and low fees.",
    logo: `${baseIconsUrl}/mycelium.jpg`,
    gecko_id: "mycelium",
    cmcId: "21437",
    chains: [],
    twitter: "mycelium_xyz",
    governanceID: ["snapshot:tracer.eth", "snapshot:myceliumgrowth.eth"]
  },
  {
    id: "Bancor",
    name: "Bancor",
    url: "https://app.bancor.network/",
    description:
    "Bancor is an on-chain liquidity protocol that enables automated, decentralized exchange on Ethereum and across blockchains.",
    logo: `${baseIconsUrl}/bancor.png`,
    gecko_id: "bancor",
    cmcId: "1727",
    chains: [],
    twitter: "Bancor",
    governanceID: ["snapshot:bancornetwork.eth"]
  },
  {
    id: "SpiritSwap",
    name: "SpiritSwap",
    url: "https://app.spiritswap.finance/#/",
    description:
      "AMM and Lending protocol on Fantom",
    logo: `${baseIconsUrl}/spiritswap.jpg`,
    gecko_id: "spiritswap",
    cmcId: "1359",
    chains: [],
    twitter: "Spirit_Swap",
    governanceID: ["snapshot:spiritswap.eth"]
  },
  {
    id: "Interlay",
    name: "Interlay",
    url: "https://interlay.io/",
    description:
      "Fully trustless and decentralized Bitcoin bridge and BTC DeFi hub",
    logo: `${baseIconsUrl}/interlay.png`,
    gecko_id: "interlay",
    cmcId: "20366",
    chains: [],
    twitter: "InterlayHQ",
  },
  {
    id: "Frax Finance",
    name: "Frax Finance",
    url: "https://frax.finance/",
    description:
      "Inventors of the fractional stablecoin. $FRAX is the 1st stablecoin with parts backed & parts algorithmic",
    logo: `${baseIconsUrl}/frax finance.png`,
    gecko_id: "frax-share",
    cmcId: "6953",
    chains: [],
    twitter: "fraxfinance",
    governanceID: ["snapshot:frax.eth"]
  },
  {
    id: "Compound Finance",
    name: "Compound Finance",
    url: "https://compound.finance/",
    description:
      "Compound is an algorithmic, autonomous interest rate protocol built for developers, to unlock a universe of open financial applications.",
    logo: `${baseIconsUrl}/compound finance.jpg`,
    gecko_id: "compound-governance-token",
    cmcId: "5692",
    chains: [],
    twitter: "compoundfinance",
    governanceID: ["snapshot:comp-vote.eth"]
  },
  {
    id: "Algofi",
    name: "Algofi",
    url: "https://www.algofi.org/",
    description:
      "Algofi is the DeFi hub built on Algorand. Earn interest, borrow, swap and more on the Algofi lending protocol, DEX, and stablecoin. Further, access liquidity against your governance ALGOs through the Algofi Vault.",
    logo: `${baseIconsUrl}/algofi.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "algofiorg",
  },
  {
    id: "Redacted",
    name: "Redacted",
    url: "https://redacted.finance",
    description:
      "The Redacted ecosystem is a product suite of smart contracts empowering on-chain liquidity, governance, and cash flow for DeFi protocols.",
    logo: `${baseIconsUrl}/redacted.png`,
    gecko_id: "redacted",
    cmcId: "21324",
    chains: [],
    twitter: "redactedcartel",
    governanceID: ["snapshot:redactedcartel.eth"]
  },
  {
    id: "Tomb Finance",
    name: "Tomb Finance",
    url: "https://tomb.finance/",
    description:
      "home to the first algorithmic token pegged to $FTM on the Fantom Opera network",
    logo: `${baseIconsUrl}/tomb-finance.jpg`,
    gecko_id: "tomb",
    cmcId: "11495",
    chains: [],
    twitter: "tombfinance",
    governanceID: ["snapshot:tombfinance.eth"]
  },
  {
    id: "Volt Finance",
    name: "Volt Finance",
    url: "https://voltswap.finance",
    description:
      "VoltSwap is the first major DEX in the Meter ecosystem",
    logo: `${baseIconsUrl}/volt finance.png`,
    gecko_id: "voltswap",
    cmcId: "19160",
    chains: [],
    twitter: "Meter_IO",
    governanceID: ["snapshot:voltswap.eth"]
  },
  {
    id: "Based Finance",
    name: "Based Finance",
    url: "https://next-gen.basedfinance.io/",
    description:
      "An innovative fork of tomb.finance, pegged to the price of 1 TOMB via seigniorage.",
    logo: `${baseIconsUrl}/based finance.png`,
    gecko_id: "based-finance",
    cmcId: "17954",
    chains: [],
    twitter: "BasedDEFI",
  },
  {
    id: "Ribbon Finance",
    name: "Ribbon Finance",
    url: "https://www.ribbon.finance/",
    description:
      "Structured products protocol",
    logo: `${baseIconsUrl}/ribbon-finance.png`,
    gecko_id: "ribbon-finance",
    cmcId: "12387",
    chains: [],
    twitter: "ribbonfinance",
    governanceID: ["snapshot:rbn.eth", "snapshot:gauge.rbn.eth"]
  },
  {
    id: "Planet",
    name: "Planet",
    url: "https://app.planet.finance/",
    description:
      "Planet is a decentralized financial protocol consisting of different planets, each their own application, designed to enable anyone to freely activate their capital.",
    logo: `${baseIconsUrl}/planet.png`,
    gecko_id: "planet-finance",
    cmcId: "10023",
    chains: [],
    twitter: "planet_finance",
    governanceID: ["snapshot:planetfinance.eth"]
  },
  {
    id: "DAO Maker",
    name: "DAO Maker",
    url: "https://daomaker.com/",
    description:
      "DAO Maker creates growth technologies and funding frameworks for startups, while simultaneously reducing risks for investors.",
    logo: `${baseIconsUrl}/dao-maker.jpg`,
    gecko_id: "dao-maker",
    cmcId: "8420",
    chains: [],
    twitter: "TheDaoMaker",
    governanceID: ["snapshot:shomustgoon.eth"]
  },
  {
    id: "Morpho",
    name: "Morpho",
    url: "https://www.morpho.xyz",
    description:
      "Morpho is an on-chain peer-to-peer layer on top of lending pools. Rates are seamlessly improved for borrowers and lenders while preserving the same guarantees.",
    logo: `${baseIconsUrl}/morpho.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "MorphoLabs",
    governanceID: ["snapshot:morpho.eth"]
  },
  {
    id: "Quickswap",
    name: "Quickswap",
    url: "https://quickswap.exchange",
    description:
      "QuickSwap is a next-gen DEX and Lending for DeFi.",
    logo: `${baseIconsUrl}/quickswap.jpg`,
    gecko_id: "quickswap",
    cmcId: "19966",
    chains: [],
    twitter: "QuickswapDEX",
    governanceID: ["snapshot:quickvote.eth"]
  },
  {
    id: "iZUMI Finance",
    name: "iZUMI Finance",
    url: "https://izumi.finance/home",
    description:
      "Liquidity Redefined - A multi-chain DeFi protocol providing One-Stop Liquidity as a Service (LaaS).",
    logo: `${baseIconsUrl}/izumi finance.png`,
    gecko_id: "izumi-finance",
    cmcId: "16305",
    chains: [],
    twitter: "izumi_Finance",
  },
  {
    id: "Temple DAO",
    name: "Temple DAO",
    url: "https://www.templedao.link",
    description:
      "The TempleDAO protocol aims to provide DeFi users with a safe haven where they can be sheltered from crypto market volatility while benefiting from a set of investment opportunities offering high yields and steady price appreciation",
    logo: `${baseIconsUrl}/temple-dao.png`,
    gecko_id: "temple",
    cmcId: "16052",
    chains: [],
    twitter: "templedao",
  },
  {
    id: "Trader Joe",
    name: "Trader Joe",
    url: "https://www.traderjoexyz.com",
    description:
      "Trader Joe is your one-stop decentralized trading platform on the Avalanche network.",
    logo: `${baseIconsUrl}/trader-joe.png`,
    gecko_id: "joe",
    cmcId: "11396",
    chains: [],
    twitter: "traderjoe_xyz",
    governanceID: ["snapshot:joegovernance.eth"]
  },
  {
    id: "handle finance",
    name: "handle finance",
    url: "https://handle.fi",
    description:
      "the global defi FX protocol. borrow, convert & trade multi-currency #stablecoins.",
    logo: `${baseIconsUrl}/handle finance.jpg`,
    gecko_id: "handle-fi",
    cmcId: "11794",
    chains: [],
    twitter: "handle_fi",
    governanceID: ["snapshot:handlefx.eth"]
  },
  {
    id: "Omnidex",
    name: "Omnidex",
    url: "https://omnidex.finance",
    description:
      "OmniDex is building a comprehensive decentralized trading platform on the Telos Blockchain.",
    logo: `${baseIconsUrl}/omnidex.jpg`,
    gecko_id: "omnidex",
    cmcId: null,
    chains: [],
    twitter: "OmniDex1",
  },
  {
    id: "Amulet",
    name: "Amulet",
    url: "https://amulet.org",
    description:
      "Amulet has designed an innovative and open risk protection model which not only effectively addresses the common challenges of existing decentralized RPPs, but also creates a new paradigm shift for the whole risk protection sector.",
    logo: `${baseIconsUrl}/amulet.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "AmuletProtocol",
  },
  {
    id: "Uniswap",
    name: "Uniswap",
    url: "https://uniswap.org/",
    description:
      "Swap, earn, and build on the leading decentralized crypto trading protocol.",
    logo: `${baseIconsUrl}/uniswap.png`,
    gecko_id: "uniswap",
    cmcId: "7083",
    chains: [],
    twitter: "Uniswap",
    governanceID: ["snapshot:uniswap"]
  },
  {
    id: "Tetu",
    name: "Tetu",
    url: "http://tetu.io",
    description:
      "Tetu is a decentralized organization committed to providing a next generation yield aggregator to DeFi investors. The Tetu core team has deep industry knowledge building back-end international banking systems and development with leading global payment processing infrastructure.",
    logo: `${baseIconsUrl}/tetu.svg`,
    gecko_id: "tetu",
    cmcId: "12452",
    chains: [],
    twitter: "tetu_io",
    governanceID: ["snapshot:tetu.eth"]
  },
  {
    id: "Pando",
    name: "Pando",
    url: "https://pando.im",
    description:
      "Pando is a set of open financial protocols which includes 3 major protocols: 1.Pando Lake/4swap: a decentralized protocol for automated liquidity provision built with the Mixin Trusted Group. 2.Pando Leaf: a decentralized financial network to minting stablecoins. 3.Pando Rings: a decentralized protocol where you can lend or borrow cryptocurrencies",
    logo: `${baseIconsUrl}/pando.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "pando_im",
  },
  {
    id: "Meteora",
    name: "Meteora",
    url: "https://meteora.ag/",
    description:
      "Building the most secure, sustainable & composable yield layer for all of Solana and DeFi",
    logo: `${baseIconsUrl}/meteora.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "MeteoraAG",
  },
  {
    id: "Folks Finance",
    name: "Folks Finance",
    url: "https://folks.finance/",
    description:
    "Lending and borrowing protocol with innovative features and Liquid Staking built on Algorand Blockchain.",
    logo: `${baseIconsUrl}/folks-finance.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "FolksFinance",
  },
  {
    id: "Yield Yak",
    name: "Yield Yak",
    url: "https://yieldyak.com",
    description:
    "Yield Yak provides tools for DeFi users on Avalanche. Discover a huge selection of autocompounding farms and make your life easier.",
    logo: `${baseIconsUrl}/yield yak.png`,
    gecko_id: "yield-yak",
    cmcId: "11415",
    chains: [],
    twitter: "yieldyak_",
    governanceID: ["snapshot:yakherd.eth"]
  },
  {
    id: "Animal Farm",
    name: "Animal Farm",
    url: "https://animalfarm.app",
    description:
    "Our vision is to make traditional finance tools, typically only reserved for the super wealthy, available to the anyone by using decentralized protocols which are not limited by the gatekeeping of centralized institutions. All of our products utilize trustless models that allow users to take full ownership of their personal finances. Lending and yield aggregating is the main focus of Animal Farm, but unlike other platforms Animal Farm is the only true decentralized ownership lending and yield aggregating platform.",
    logo: `${baseIconsUrl}/animal farm.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "DRIPcommunity",
    governanceID: ["snapshot:theanimalfarm.eth"]
  },
  {
    id: "Metavault",
    name: "Metavault",
    url: "https://metavault.org/",
    description:
    "Metavault is a blockchain-based, community governed investment platform and decentralized venture capital fund. It allows anyone to participate in the latest and most profitable DeFi projects and strategies and deploys a in-house development team for project incubation.",
    logo: `${baseIconsUrl}/metavault.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "MetavaultDAO",
    governanceID: ["snapshot:metavault-trade.eth", "snapshot:metavault-dao.eth"]
  },
  {
    id: "MUX Protocol",
    name: "MUX Protocol",
    url: "https://mux.network/",
    description:
    "MUX (Previously MCDEX),The first Multi-Chain native leveraged trading protocol,\r\nallowing zero price impact trading, up to 100x leverage, no counterparty risks for traders and an optimized on-chain trading experience",
    logo: `${baseIconsUrl}/mux protocol.png`,
    gecko_id: "mcdex",
    cmcId: "5956",
    chains: [],
    twitter: "muxprotocol",
    governanceID: ["snapshot:muxvote.eth"]
  },
  {
    id: "WOO Network",
    name: "WOO Network",
    url: "https://woo.org",
    description:
    "Bringing best-in-class liquidity to DeFi and CeFi.",
    logo: `${baseIconsUrl}/woo network.jpg`,
    gecko_id: "woo-network",
    cmcId: "7501",
    chains: [],
    twitter: "WOOnetwork",
  },
  {
    id: "Revert",
    name: "Revert",
    url: "https://revert.finance",
    description:
    "Actionable analytics for AMM liquidity providers.",
    logo: `${baseIconsUrl}/revert.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "revertfinance",
  },
  {
    id: "Polycat Finance",
    name: "Polycat Finance",
    url: "https://polycat.finance",
    description:
    "Polycat is a decentralized hybrid yield optimizer (yield farm and yield aggregator) running on the Polygon blockchain (formerly known as MATIC). The Paw token is the second token in their ecosystem that they introduced with the launch of their AMM.",
    logo: `${baseIconsUrl}/polycat finance.jpg`,
    gecko_id: "polycat-finance",
    cmcId: "10134",
    chains: [],
    twitter: "PolycatFinance",
    governanceID: ["snapshot:polycatfi.eth"]
  },
  {
    id: "mStable",
    name: "mStable",
    url: "https://mstable.org/",
    description:
    "mStable unites stablecoins, lending and swapping into one standard.",
    logo: `${baseIconsUrl}/mstable.png`,
    gecko_id: "meta",
    cmcId: "5748",
    chains: [],
    twitter: "mstable_",
    governanceID: ["snapshot:mstablegovernance.eth"]
  },
  {
    id: "RealT",
    name: "RealT",
    url: "https://realt.co",
    description:
    "RealToken provides investors with a method to buy into fractional, tokenized properties, leveraging the U.S. legal system and the permissionless, unrestricted token issuance of Ethereum",
    logo: `${baseIconsUrl}/realt.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "RealTPlatform",
  },
  {
    id: "NEOPIN",
    name: "NEOPIN",
    url: "https://neopin.io",
    description:
    "NEOPIN is a blockchain open platform that connects and expands the ecosystem through Gaming, Metaverse, Service, and NFTs, centering on various DeFi services such as staking, yield farming, and swap.",
    logo: `${baseIconsUrl}/neopin.jpg`,
    gecko_id: "neopin",
    cmcId: "18966",
    chains: [],
    twitter: "NeopinOfficial",
  },
  {
    id: "Sperax",
    name: "Sperax",
    url: "http://sperax.io",
    description:
    "SperaxUSD (USDs) is a stablecoin and yield-automator on Arbitrum. USDs is 100% backed by collateral that is sent to DeFi strategies to produce a yield. This yield is then distributed to holders in a gasless manner, making compound interest easy",
    logo: `${baseIconsUrl}/sperax.png`,
    gecko_id: "sperax",
    cmcId: "6715",
    chains: [],
    twitter: "SperaxUSD",
    governanceID: ["snapshot:speraxdao.eth"]
  },
  {
    id: "Opyn",
    name: "Opyn",
    url: "https://www.opyn.co",
    description:
    "Opyn is building Defi-native derivatives and options infrastructure in DeFi",
    logo: `${baseIconsUrl}/opyn.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "opyn_",
  },
  {
    id: "NEST Protocol",
    name: "NEST Protocol",
    url: "https://nestprotocol.org",
    description:
    "The NEST oracle solves the problem of price on-chain through a decentralized incentive solution, that is, the price predictor.",
    logo: `${baseIconsUrl}/nest-protocol.png`,
    gecko_id: "nest",
    cmcId: "5841",
    chains: [],
    twitter: "nest_protocol",
    governanceID: ["snapshot:nestecosystem.eth"]
  },
  {
    id: "BAO Finance",
    name: "BAO Finance",
    url: "https://app.bao.finance",
    description:
    "Bao Finance is a decentralized, community-run project that uses synthetics to move the power of information from institutions to individuals",
    logo: `${baseIconsUrl}/bao finance.jpg`,
    gecko_id: "bao-finance-v2",
    cmcId: null,
    chains: [],
    twitter: "BaoFinance",
    governanceID: ["snapshot:pandaswapbsc.eth", "snapshot:baovotes.eth"]
  },
  {
    id: "UniWswap",
    name: "UniWswap",
    url: "https://uniwswap.com/",
    description:
    "UniWswap is an AMM and Farm on EthereumPoW",
    logo: `${baseIconsUrl}/uniwswap.png`,
    gecko_id: "uniwswap",
    cmcId: null,
    chains: [],
    twitter: "uniwswap",
  },
  {
    id: "Metronome",
    name: "Metronome",
    url: "https://www.metronome.io/",
    description:
    "Synthesizing the future of DeFi.",
    logo: `${baseIconsUrl}/metronome.png`,
    gecko_id: "metronome",
    cmcId: "2873",
    chains: [],
    twitter: "MetronomeDAO",
    governanceID: ["snapshot:metronome.eth"]
  },
  {
    id: "Paraluni",
    name: "Paraluni",
    url: "https://paraluni.org",
    description:
    "Paraluni,based on the BSC,a no holding currency, no ICO, no pre-mining decentralized platform.",
    logo: `${baseIconsUrl}/paraluni.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "paraluni",
  },
  {
    id: "Waterfall Finance",
    name: "Waterfall Finance",
    url: "https://wtf.defiwaterfall.com",
    description:
    "An innovative eco-system",
    logo: `${baseIconsUrl}/waterfall-wtf.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "defi_waterfall",
  },
  {
    id: "Inverse Finance",
    name: "Inverse Finance",
    url: "https://www.inverse.finance",
    description:
    "DOLA Borrowing Rights replace interest rates with a fixed fee that can earn you more.",
    logo: `${baseIconsUrl}/inverse-finance.jpg`,
    gecko_id: "inverse-finance",
    cmcId: "8720",
    chains: [],
    twitter: "InverseFinance",
  },
  {
    id: "Kujira Protocol",
    name: "Kujira Protocol",
    url: "https://kujira.app",
    description:
    "A decentralized ecosystem for protocols, builders and web3 users seeking sustainable FinTech.",
    logo: `${baseIconsUrl}/kujira-protocol.png`,
    gecko_id: "kujira",
    cmcId: "15185",
    chains: [],
    twitter: "TeamKujira",
  },
  {
    id: "Steakhut Finance",
    name: "Steakhut Finance",
    url: "https://www.steakhut.finance",
    description:
    "Discover endless DeFi opportunities, join the liquidity layer of Avalanche.",
    logo: `${baseIconsUrl}/steakhut-finance.png`,
    gecko_id: "steakhut-finance",
    cmcId: "20266",
    chains: [],
    twitter: "steakhut_fi",
  },
  {
    id: "MahaDAO",
    name: "MahaDAO",
    url: "https://mahadao.com",
    description:
    "MahaDAO is a community focused DAO focused on building ARTH, a decentralized valuecoin that maintains the purchasing power of it's token. It is designed to appreciate against the US dollar (after accounting for inflation) in the long run whilst remaining relatively stable in the short run.",
    logo: `${baseIconsUrl}/mahadao.png`,
    gecko_id: "mahadao",
    cmcId: "8043",
    chains: [],
    twitter: "TheMahaDAO",
    governanceID: ["snapshot:maha.eth"]
  },
  {
    id: "Tethys Finance",
    name: "Tethys Finance",
    url: "https://tethys.finance",
    description:
    "We believe that in the future, L2 solutions will help Ethereum with scaling. Our mission is to empower the Metis Andromeda network with a fast, secure, reliable, and advanced native decentralized exchange app to handle all kinds of trading needs.",
    logo: `${baseIconsUrl}/tethys-finance.png`,
    gecko_id: "tethys-finance",
    cmcId: "16640",
    chains: [],
    twitter: "tethysfinance",
    governanceID: ["snapshot:tethysswap.eth"]
  },
  {
    id: "Timeless",
    name: "Timeless",
    url: "https://timelessfi.com",
    description:
    "Timeless is powered by yield tokens, specially designed ERC-20 tokens whose values are related to yield rates. Each farm corresponds to a set of three yield tokens.",
    logo: `${baseIconsUrl}/timeless.jpg`,
    gecko_id: "timeless",
    cmcId: "23236",
    chains: [],
    twitter: "Timeless_Fi",
    governanceID: ["snapshot:timelessfi.eth"]
  },
  {
    id: "Cap Finance",
    name: "Cap Finance",
    url: "https://www.cap.io",
    description:
    "Decentralized Perps. Trade with up to 100x leverage directly from your wallet. ",
    logo: `${baseIconsUrl}/cap-finance.jpg`,
    gecko_id: "cap",
    cmcId: "5809",
    chains: [],
    twitter: "CapDotFinance",
  },
  {
    id: "SPHERE",
    name: "SPHERE",
    url: "https://www.sphere.finance",
    description:
    "The center of DeFi - earn revenue from multiple innovative streams by holding one token.",
    logo: `${baseIconsUrl}/sphere.jpg`,
    gecko_id: "sphere-finance",
    cmcId: "18945",
    chains: [],
    twitter: "SphereDeFi",
    governanceID: ["snapshot:spherefinance.eth"]
  },
  {
    id: "PancakeSwap",
    name: "PancakeSwap",
    url: "https://pancakeswap.finance",
    description:
    "Trade. Earn. Win. NFT.",
    logo: `${baseIconsUrl}/pancakeswap.jpg`,
    gecko_id: "pancakeswap-token",
    cmcId: "1165",
    chains: [],
    twitter: "PancakeSwap",
    governanceID: ["snapshot:cakevote.eth"]
  },
  {
    id: "ZyberSwap",
    name: "ZyberSwap",
    url: "https://www.zyberswap.io",
    description:
    "Zyberswap is one of the first decentralized exchanges (DEX) with an automated market-maker (AMM) on the Arbitrum blockchain. ",
    logo: `${baseIconsUrl}/zyberswap.jpg`,
    gecko_id: "zyberswap",
    cmcId: "23419",
    chains: [],
    twitter: "zyberswap",
  },
  {
    id: "Scrub Money",
    name: "Scrub Money",
    url: "https://scrub.money",
    description:
    "Decentralized commerce and services ecosystem",
    logo: `${baseIconsUrl}/scrub-money.png`,
    gecko_id: "lion-scrub-finance",
    cmcId: "19410",
    chains: [],
    twitter: "ScrubFinance",
  },
  {
    id: "Ondo Finance",
    name: "Ondo Finance",
    url: "https://ondo.finance",
    description:
    "Institutional-Grade Finance. On-Chain. For Everyone",
    logo: `${baseIconsUrl}/ondo-finance.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "OndoFinance",
  },
  {
    id: "Bank Of Cronos",
    name: "Bank Of Cronos",
    url: "https://boc.bankofcronos.com",
    description:
    "BOC is a community-owned decentralized autonomous organization introducing DeFi protocols on the Cronos network. DeFi Simplified, on Cronos.",
    logo: `${baseIconsUrl}/bank-of-cronos.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "bankofcronos",
  },
  {
    id: "BendDAO",
    name: "BendDAO",
    url: "https://www.benddao.xyz",
    description:
    "Use your NFTs as collateral to borrow ETH or deposit your ETH and earn yields instantly.",
    logo: `${baseIconsUrl}/benddao.png`,
    gecko_id: "benddao",
    cmcId: "19162",
    chains: [],
    twitter: "BendDAO",
  },
  {
    id: "Subzero",
    name: "Subzero",
    url: "https://subzero.plus",
    description:
    "Subzero is a decentralized venture capital investment protocol on the Avalanche network. The protocol focuses on sustainable mechanisms to encourage long-term staking and providing liquidity.",
    logo: `${baseIconsUrl}/subzero.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "subzeroplus",
  },
  {
    id: "Diamond",
    name: "Diamond",
    url: "https://dmo.finance",
    description:
    "Diamond Protocol aims to be the DeFi Lab to build on-chain structured products to earn sustainable yield on crypto assets.",
    logo: `${baseIconsUrl}/diamond.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "DiamondProtocol",
  },
  {
    id: "Lif3.com",
    name: "Lif3.com",
    url: "https://lif3.com/",
    description:
    "Lif3.com is a complete multi-chain DeFi Ecosystem",
    logo: `${baseIconsUrl}/lif3.com.png`,
    gecko_id: "lif3",
    cmcId: "20611",
    chains: [],
    twitter: "Official_LIF3",
  },
  {
    id: "Timeswap",
    name: "Timeswap",
    url: "https://timeswap.io",
    description:
    "Timeswap is a fixed time preference protocol for users to manage their ERC20 tokens over discrete time. It works as a zero liquidation money market and options market in one.",
    logo: `${baseIconsUrl}/timeswap.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "TimeswapLabs",
  },
  {
    id: "Moonwell",
    name: "Moonwell",
    url: "https://moonwell.fi/",
    description:
    "Moonwell is an open lending and borrowing DeFi protocol on Moonbeam & Moonriver",
    logo: `${baseIconsUrl}/moonwell-artemis.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "LunarTechFdn",
  },
  {
    id: "BeamSwap",
    name: "BeamSwap",
    url: "https://beamswap.io",
    description:
    "Defi Hub on Moonbeam",
    logo: `${baseIconsUrl}/beamswap.jpg`,
    gecko_id: "beamswap",
    cmcId: "17035",
    chains: [],
    twitter: "Beamswapio",
  },
  {
    id: "Surfswap",
    name: "Surfswap",
    url: "https://surfdex.io/",
    description:
    "Community DEX on Kava. One-stop shop for the crypto community, enabling peer-to-peer transactions.",
    logo: `${baseIconsUrl}/surfswap.jpg`,
    gecko_id: "surfswap",
    cmcId: null,
    chains: [],
    twitter: "SurfswapDEX",
  },
  {
    id: "Balancer",
    name: "Balancer",
    url: "https://balancer.fi",
    description:
    "Balancer is a decentralized automated market maker (AMM) protocol built on Ethereum that represents a flexible building block for programmable liquidity.",
    logo: `${baseIconsUrl}/balancer.png`,
    gecko_id: "balancer",
    cmcId: "5728",
    chains: [],
    twitter: "Balancer",
  },
  {
    id: "KyberSwap",
    name: "KyberSwap",
    url: "https://kyberswap.com",
    description:
    "Multichain DEX & aggregator on 14 chains. KyberSwap is both a decentralized exchange (DEX) aggregator and a liquidity source with capital-efficient liquidity pools that earns fees for liquidity providers.",
    logo: `${baseIconsUrl}/kyberswap.png`,
    gecko_id: "kyber-network-crystal",
    cmcId: "9444",
    chains: [],
    twitter: "KyberNetwork",
  },
];

export default parentProtocols;
