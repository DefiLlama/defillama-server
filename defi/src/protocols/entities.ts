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
        logo: "dragonfly.jpg",
        category: "VC",
        module: "entities/fbg-capital.js",
        twitter: "FBGCapital"
    },
].map(entity=>({
    ...entity,
    id: `entity-${entity.id}`,
    logo: `${baseIconsUrl}/${entity.logo}`,
    symbol: "", chain: "", gecko_id:null, cmcId:null, chains:[]
}))

export default entities;
export const treasuriesAndEntities = treasuries.concat(entities)