import { baseIconsUrl } from "../constants";
import treasuries from "./treasury";

const entities = [
    {
        id: "1",
        name: "a16z",
        url: "https://a16z.com/",
        description: "Founded in Silicon Valley in 2009 by Marc Andreessen and Ben Horowitz, Andreessen Horowitz (known as a16z) is a venture capital firm that backs bold entrepreneurs building the future through technology.",
        logo: "a16z.jpg",
        category: "VC",
        module: "entities/a16z-cold.js",
        twitter: "a16z"
    },
    {
        id: "2",
        name: "AKG Ventures",
        url: "http://www.akgvc.com",
        description: "AKG Ventures Investing in : Exchanges, derivatives tools, defi, NFT, digital mining and other fields.",
        logo: "akg-ventures.jpg",
        category: "VC",
        module: "entities/akg-ventures.js",
        twitter: "AkgVentures"
    },
    {
        id: "3",
        name: "Animoca Brands",
        url: "https://www.animocabrands.com",
        description: "Animoca Brands Corporation Ltd is a Hong Kong-based game software company and venture capital company co-founded in 2014 by Yat Siu and David Kim. The company initially focused on developing mobile games, then shifted to blockchain gaming and NFTs in 2018.",
        logo: "animoca-brands.jpg",
        category: "VC",
        module: "entities/animoca-brands.js",
        twitter: "animocabrands"
    },
    {
        id: "4",
        name: "Arca",
        url: "https://www.ar.ca",
        description: "Arca is an investment firm offering institutional caliber products in the digital asset space.",
        logo: "arca.png",
        category: "VC",
        module: "entities/arca.js",
        twitter: "arca"
    },
    {
        id: "5",
        name: "Axia8 Ventures",
        url: "https://www.axia8.com",
        description: "Founded in June of 2020, Axia8 Ventures invests and builds with teams in the blockchain and crypto industry. Through the provision of strategies, networks, and capital to committed, ambitious entrepreneurs, we devote to the future of on-chain activities.",
        logo: "axia8-venture.jpg",
        category: "VC",
        module: "entities/axia8-venture.js",
        twitter: "Axia8Ventures"
    },
    {
        id: "6",
        name: "Binance Labs Fund",
        url: "https://labs.binance.com",
        description: "Binance Labs identifies, invests, and empowers viable blockchain entrepreneurs, startups, and communities, providing financing to industry projects that help grow the wider blockchain ecosystem.",
        logo: "binance-labs-fund.png",
        category: "VC",
        module: "entities/binance-labs.js",
        twitter: "BinanceLabs"
    },
    {
        id: "7",
        name: "Block One",
        url: "https://b1.com",
        description: "At Block.one, we originate, incubate, acquire, and invest in technologies and businesses that build trust in transactions and increase efficiencies in the world we live in.",
        logo: "block-one.png",
        category: "VC",
        module: "entities/block-one.js",
        twitter: "B1"
    },
    {
        id: "8",
        name: "Blockchain Capital",
        url: "https://blockchain.capital",
        description: "Blockchain Capital is a leading venture firm in the blockchain industry. In the last 9 years we have made over 160 investments in companies and protocols in the sector, across different stages, geographies and asset types.",
        logo: "blockchain-capital.jpg",
        category: "VC",
        module: "entities/blockchain-capital.js",
        twitter: "blockchaincap"
    },
    {
        id: "9",
        name: "Chain Capital",
        url: "https://capital-chain.com",
        description: "Looking for the most ambitious blockchain projects! Focus on Blockchain Infrastructure, Data Storage,Defi,Cross Chain etc.",
        logo: "chain-capital.jpg",
        category: "VC",
        module: "entities/chain-capital.js",
        twitter: "ChainCapital666"
    },
    {
        id: "10",
        name: "Coin98 Ventures",
        url: "https://coin98.ventures",
        description: "Investing In Pioneers Building The Future Of Open Internet.",
        logo: "coin98-venture.jpg",
        category: "VC",
        module: "entities/coin98-venture.js",
        twitter: "Coin98Ventures"
    },
    {
        id: "11",
        name: "DeFiance Capital",
        url: "https://defiance.capital",
        description: "DeFiance Capital is one of the most active and recognised Web 3 & Crypto focused investment firm globally with many successful investments across DeFi, Web3 gaming and infrastructure space.",
        logo: "defiance-capital.jpg",
        category: "VC",
        module: "entities/defiance-capital.js",
        twitter: "DeFianceCapital"
    },
    {
        id: "12",
        name: "Delphi Digital",
        url: "https://members.delphidigital.io",
        description: "Institutional Grade Crypto Research.",
        logo: "delphi-digital.jpg",
        category: "VC",
        module: "entities/delphi-digital.js",
        twitter: "Delphi_Digital"
    },
    {
        id: "13",
        name: "DFG Group",
        url: "https://www.dfg.group/portfolio",
        description: "An Investment Firm Empowering Blockchain & Web 3.0",
        logo: "dfg-group.jpg",
        category: "VC",
        module: "entities/digital-finance-group.js",
        twitter: null
    },
    {
        id: "14",
        name: "Dragonfly",
        url: "https://www.dragonfly.xyz",
        description: "A cross-border crypto venture fund. Global from day one.",
        logo: "dragonfly.jpg",
        category: "VC",
        module: "entities/dragonfly-capital.js",
        twitter: "dragonfly_xyz"
    },
    {
        id: "15",
        name: "FBG Capital",
        url: "https://www.fbg.capital",
        description: "FBG Capital is a digital asset management firm. FBG Capital also incubates promising blockchain projects and companies.",
        logo: "fbg-capital.jpg",
        category: "VC",
        module: "entities/fbg-capital.js",
        twitter: "FBGCapital"
    },
    {
        id: "16",
        name: "Fenbushi Capital",
        url: "https://www.fenbushicapital.vc/",
        description: "Fenbushi Capital is the first and most active blockchain-focused venture capital firm in Asia. Founded in Shanghai in 2015 by veterans across both blockchain and traditional financial industries, it has to date supported over 60 leading projects across 4 continents leveraging blockchain technology to reshape myriad industries such as finance, healthcare, supply chain, and consumer goods. ",
        logo: "fenbushi-capital.jpg",
        category: "VC",
        module: "entities/fenbushi-capital.js",
        twitter: "fenbushi"
    },
    {
        id: "17",
        name: "Framework Ventures",
        url: "https://framework.ventures/",
        description: "A thesis-driven crypto venture firm that builds alongside our founders.",
        logo: "framework-ventures.jpg",
        category: "VC",
        module: "entities/framework-ventures.js",
        twitter: "hiFramework"
    },
    {
        id: "18",
        name: "Genesis Trading",
        url: "https://genesistrading.com/",
        description: "Genesis is a premier financial services firm connecting institutional investors to digital asset markets.",
        logo: "genesis-trading.jpg",
        category: "VC",
        module: "entities/genesis-trading.js",
        twitter: "GenesisTrading"
    },
    {
        id: "19",
        name: "LD Capital",
        url: "https://ldcap.com/",
        description: "Web3 VC supported 250+ portfolios since 2016. The investments span across Infra, Defi, Gamefi, AI, ETH eco, with afocus on disruptive innovative projects.",
        logo: "ld-capital.jpg",
        category: "VC",
        module: "entities/id-capital.js",
        twitter: "LD_Capital"
    },
    {
        id: "20",
        name: "Jump Capital",
        url: "https://jumpcap.com/",
        description: "Jump’s thesis-driven approach and depth of knowledge and experience in financial technology have made them a great partner to Personal Capital and one of our most valuable investors.",
        logo: "jump-capital.jpg",
        category: "VC",
        module: "entities/jump-capital.js",
        twitter: "jumpcapital"
    },
    {
        id: "21",
        name: "Mechanism Capital",
        url: "https://www.mechanism.capital/",
        description: "Investor",
        logo: "mechanism-capital.jpg",
        category: "VC",
        module: "entities/mechanism-capital.js",
        twitter: "MechanismCap"
    },
    {
        id: "22",
        name: "NGC Ventures",
        url: "https://ngc.fund",
        description: "NGC Ventures is one of the largest institutional investors of blockchain technologies, and has been a key contributor to a number of leading projects.",
        logo: "ngc-ventures.jpg",
        category: "VC",
        module: "entities/ngc-ventures.js",
        twitter: "NGC_Ventures"
    },
    {
        id: "23",
        name: "Pantera Capital",
        url: "https://panteracapital.com/",
        description: "Since 2013, Pantera has invested in digital assets and blockchain companies, providing investors with the full spectrum of exposure to the space. First U.S. institutional asset manager focused exclusively on blockchain technology.",
        logo: "pantera-capital.png",
        category: "VC",
        module: "entities/pantera-capital.js",
        twitter: "PanteraCapital"
    },
    {
        id: "24",
        name: "Paradigm",
        url: "https://www.paradigm.xyz/",
        description: "We focus on crypto and related technologies at the frontier. We invest in, build, and contribute to companies and protocols with as little as $1M and as much as $100M+. We often get involved at the earliest stages and continue to support our portfolio companies over time.",
        logo: "paradigm.jpg",
        category: "VC",
        module: "entities/paradigm-capital.js",
        twitter: "paradigm"
    },
    {
        id: "25",
        name: "Plutos VC",
        url: "https://www.plutusvc.com/",
        description: "PLUTUSVC understands the need for a safe, secured, and trustworthy crypto lending partner, especially after serial insolvency issues happened among different Defi and lending platforms.",
        logo: "plutus-vc.jpg",
        category: "VC",
        module: "entities/plutus-vc.js",
        twitter: "PlutusVc"
    },
    {
        id: "26",
        name: "Polychain Capital",
        url: "https://polychain.capital/",
        description: "Polychain is an investment firm committed to exceptional returns for investors through actively managed portfolios of these blockchain assets.",
        logo: "polychain-capital.jpg",
        category: "VC",
        module: "entities/polychain-capital.js",
        twitter: "polychain"
    },
    {
        id: "27",
        name: "DWF Labs",
        url: "https://www.dwf-labs.com",
        description: "DWF Labs is the global digital asset market maker and multi-stage web3 investment firm, one of the world's largest high-frequency cryptocurrency trading entities, which trades spot and derivatives markets on over 60 top exchanges.",
        logo: "dwf-labs.jpg",
        category: "VC",
        module: "entities/dwf-labs.js",
        twitter: "DWFLabs"
    },
    {
        id: "28",
        name: "GSR",
        url: "https://www.gsr.io/",
        description: "GSR has ten years of deep crypto market expertise as a market maker and active, multi-stage investor. We build long-term relationships by offering exceptional service and trading capabilities tailored to the specific needs of our clients.",
        logo: "gsr.jpg",
        category: "VC",
        module: "entities/gsr.js",
        twitter: "GSR_io"
    },
    {
        id: "29",
        name: "ConsenSys",
        url: "https://consensys.io",
        description: "A complete suite of products to create and participate in web3.",
        logo: "consensys.jpg",
        category: "VC",
        module: "entities/consensys.js",
        twitter: "Consensys"
    },
    {
        id: "30",
        name: "Arrington Capital",
        url: "https://www.arringtoncapital.com/",
        description: "Arrington Capital is a thesis-driven firm investing in digital assets and web3 since 2017.",
        logo: "arrington-capital.png",
        category: "VC",
        module: "entities/arrington-xrp-capital.js",
        twitter: "Arrington_Cap"
    },
    {
        id: "31",
        name: "HashKey Capital",
        url: "https://hashkey.capital",
        description: "Global in influence and crypto-native, HashKey Capital is a digital asset and blockchain leader helping institutions, founders and talents advance the blockchain industry and find adoption anywhere.",
        logo: "hashkey-capital.jpg",
        category: "VC",
        module: "entities/hashkey-capital.js",
        twitter: "HashKey_Capital"
    },
    {
        id: "32",
        name: "Sequoia Capital",
        url: "https://www.sequoiacap.com",
        description: "We help the daring build legendary companies from idea to IPO and beyond.",
        logo: "sequoia-capital.png",
        category: "VC",
        module: "entities/sequoia-capital.js",
        twitter: "sequoia"
    },
    {
        id: "33",
        name: "Digital Currency Group",
        url: "https://dcg.co",
        description: "We build, buy, and invest in bitcoin and blockchain companies. Parent of Grayscale, GenesisTrading, CoinDesk, FoundryServices, LunoGlobal",
        logo: "digital-currency-group.jpg",
        category: "VC",
        module: "entities/digital-currency-group.js",
        twitter: "DCGco"
    },
    {
        id: "34",
        name: "Brevan Howard",
        url: "https://www.brevanhoward.com",
        description: "Founded in 2002, we are a leading global alternative investment management platform, specialising in global macro and digital assets.",
        logo: "brevan-howard.jpg",
        category: "VC",
        module: "entities/brevan-howard-digital.js",
        twitter: "DCGco"
    },
    {
        id: "35",
        name: "Abraxas Capital",
        url: "https://www.abraxascm.com",
        description: "Founded by Fabio Frontini in 2002 with the objective of building a best-in-class asset manager boutique, from 2017 Abraxas Capital Management specialized in the digital assets space becoming a world leading digital asset manager. ",
        logo: "abraxas-capital.jpg",
        category: "VC",
        module: "entities/abraxas-capital.js",
        twitter: null
    },
].map(entity=>({
    ...entity,
    id: `entity-${entity.id}`,
    logo: `${baseIconsUrl}/${entity.logo}`,
    symbol: "", chain: "", gecko_id:null, cmcId:null, chains:[]
}))

export default entities;
export const treasuriesAndEntities = treasuries.concat(entities)