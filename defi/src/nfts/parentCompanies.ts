interface NFTCompany {
    name:string,
    url: string,
    twitter?: string,
    nftCollections: [string, string][], // Second name is only used for verification so doesnt need to match perfectly
}

export const nftParentCompanies: NFTCompany[] = [
    {
        name:"Yuga Labs",
        url: "https://yuga.com/",
        twitter: "yugalabs",
        nftCollections: [
            ["0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d", "BAYC"],
            ["0x60e4d786628fea6478f785a6d7e704777c86a7c6", "MAYC"],
            ["0xba30e5f9bb24caa003e9f2f0497ad287fdf95623", "BAKC"],
            ["0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb", "Cryptopunks"],
            ["0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7", "Meebits"],
            ["0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258", "Otherdeed for Otherside"]
        ]
    },
    {
        name: "Proof Collective",
        url: "https://www.proof.xyz/",
        twitter: "proof_xyz",
        nftCollections: [
            ["0x23581767a106ae21c074b2276d25e5c3e136a68b", "Moonbirds"],
            ["0x1792a96e5668ad7c167ab804a100ce42395ce54d", "Moonbirds Oddities"],
            ["0x08d7c0242953446436f34b4c78fe9da38c73668d", "PROOF Collective"],
            ["0x13303b4ee819fac204be5ef77523cfcd558c082f", "Mythics Eggs"],
        ]
    },
    {
        name: "RTFKT",
        url: "https://rtfkt.com/",
        twitter: "RTFKT",
        nftCollections: [
            ["0x86825dfca7a6224cfbd2da48e85df2fc3aa7c4b1", "RTFKT MNLTH"],
            ["0x348fc118bcc65a92dc033a951af153d14d945312", "RTFKT - CloneX Mintvial"],
            ["0x6d4bbc0387dd4759eee30f6a482ac6dc2df3facf", "RTFKT X NIKE Trillium Lace Engine"],
            ["0xf661d58cfe893993b11d53d11148c4650590c692", "RTFKT x Nike Dunk Genesis CRYPTOKICKS"],
            ["0x9a06ef3a841316a9e2c1c93b9c21a7342abe484f", "RTFKT SKIN VIAL: EVO X"],
            ["0xb7be4001bff2c5f4a61dd2435e4c9a19d8d12343", "RTFKT PodX"],
            ["0xcd1dbc840e1222a445be7c1d8ecb900f9d930695", "RTFKT x JeffStaple"],
            ["0x0972290a80333d19c6703073c3e57134a4ca0127", "RTFKT BONUS ITEMS"],
            ["0x2250d7c238392f4b575bb26c672afe45f0adcb75", "FEWOCiOUS x RTFKT"],
            ["0xc541fc1aa62384ab7994268883f80ef92aac6399", "RTFKT Capsule  Space Drip 1.2"],
            ["0xae3d8d68b4f6c3ee784b2b0669885a315ba77c08", "RTFKT PUNK PROJECT GEN 1"],
            ["0x6c410cf0b8c113dc6a7641b431390b11d5515082", "RTFKT Animus Egg 🥚"],
            ["0x9930929903f9c6c83d9e7c70d058d03c376a8337", "RTFKT Creators"],
            ["0xd3f69f10532457d35188895feaa4c20b730ede88", "RTFKT Capsule  Space Drip"],
            ["0xa49a0e5ef83cf89ac8aae182f22e6464b229efc8", "RTFKT Clone X Forging SZN 1 (PRE-FORGE) ⚒️"],
            ["0x253ef258563e146f685e60219da56a6b75178e19", "RTFKT x RIMOWA Meta-Artisan Collection 🌌"],
            ["0x25708f5621ac41171f3ad6d269e422c634b1e96a", "RTFKT - Mintdisc 3"],
            ["0x20fd8d8076538b0b365f2ddd77c8f4339f22b970", "RTFKT - Mintdisc 1"],
            ["0x212590b0dac9502e0591b79db4cedeb6356dcc36", "RTFKT x NIKE AR HOODIE PRE FORGED"],
            ["0x56a67d475ded20f1120d6377988ae12992888ac4", "RTFKT - MNLTH X"],
            ["0x50b8740d6a5cd985e2b8119ca28b481afa8351d9", "RTFKTstudios Easter Eggs"],
            ["0x43764f5b8973f62a6f10914516131c1489e3190d", "RTFKT X TAKASHI MURAKAMI X GAGOSIAN CLONE X NYC"],
            ["0x029af5c555807c2b5d337478e5f895e8f3b557e2", "Space Drip Forging - RTFKT Space Drip x Nike Air Force 1"],
            ["0x4fb48c4da0a633aa9de199ad43bf70e316310541", "RTFKT SKIN VIAL: ERC1150"],
            ["0x11708dc8a3ea69020f520c81250abb191b190110", "RTFKT Cryptokicks iRL 👟"],
            ["0x895554bc4f48fe1c2bf5c198bfa3513da538f86b", "RTFKT Exodus Pods 🪐"],
        ]
    },
    {
        name:"Art Blocks",
        url: "https://www.artblocks.io/",
        twitter: "artblocks_io",
        nftCollections: [
            ["0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", "Art Blocks"],
            ["0x059edd72cd353df5106d2b9cc5ab83a52287ac3a", "ArtBlock"],

        ]
    },
    {
        name:"Azuki",
        url: "https://www.azuki.com/",
        twitter: "Azuki",
        nftCollections: [
            ["0xed5af388653567af2f388e6224dc7c4b3241c544", "Azuki"],
            ["0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949", "BEANZ Official"],
        ]
    },
    {
        name:"Doodles",
        url: "https://www.doodles.app/",
        twitter: "doodles",
        nftCollections: [
            ["0x8a90cab2b38dba80c64b7734e58ee1db38b8992e", "Doodles"],
            ["0x620b70123fb810f6c653da7644b5dd0b6312e4d8", "Space Doodles"],
        ]
    },
    {
        name:"Parallel Alpha",
        url: "https://parallel.life",
        twitter: "ParallelTCG",
        nftCollections: [
            ["0x76be3b62873462d2142405439777e971754e8e77", "Parallel Alpha"],
        ]
    },
    {
        name:"Legends Reborn",
        url: "https://www.legendsreborn.game",
        twitter: "GoGalaGames",
        nftCollections: [
            ["0xc36cf0cfcb5d905b8b513860db0cfe63f6cf9f5c", "Legends Reborn"],
        ]
    },
    {
        name:"The Sandbox",
        url: "https://www.sandbox.game/en",
        twitter: "GoGalaGames",
        nftCollections: [
            ["0x50f5474724e0ee42d9a4e711ccfb275809fd6d4a", "Sandbox's LANDs"],
            ["0x5cc5b05a8a13e3fbdb0bb9fccd98d38e50f90c38", "The Sandbox"],
            ["0xa342f5d851e866e18ff98f351f2c6637f4478db5", "The Sandbox ASSETS"],
            ["0x68aea268f92b715e073d2f5170039faa4b94a47b", "Fantasy Islands - Sandbox"],
            ["0xf17131a4c85e8a75ba52b3f91ce8c32f6f163924", "The Sandbox Official Open Sea Store"],
        ]
    },
    {
        name:"Audioglyphs",
        url: "https://www.audioglyphs.io",
        twitter: "audioglyphs",
        nftCollections: [
            ["0xfb3765e0e7ac73e736566af913fa58c3cfd686b7", "Audioglyphs"],
        ]
    },
    {
        name:"Cool Cats NFT",
        url: "https://coolcatsnft.com",
        twitter: "coolcats",
        nftCollections: [
            ["0x1a92f7381b9f03921564a437210bb9396471050c", "Cool Cats NFT"],
        ]
    },
    {
        name:"VeeFriends",
        url: "https://veefriends.com",
        twitter: "veefriends",
        nftCollections: [
            ["0xa3aee8bce55beea1951ef834b99f3ac60d1abeeb", "VeeFriends"],
            ["0x9378368ba6b85c1fba5b131b530f5f5bedf21a18", "VeeFriends Series 2"],
            ["0x65fff8f5f6a9922b6dc13fe06345a0fe46dd413d", "VeeFriends Iconics"],
            ["0x6cb5c137ed297c74c8dc1f7c669bbd9a60b98c3c", "VeeFriends Mini Drops 2"],
        ]
    },
    {
        name:"VeeFriends",
        url: "https://veefriends.com",
        twitter: "veefriends",
        nftCollections: [
            ["0xa3aee8bce55beea1951ef834b99f3ac60d1abeeb", "VeeFriends"],
            ["0x9378368ba6b85c1fba5b131b530f5f5bedf21a18", "VeeFriends Series 2"],
            ["0x65fff8f5f6a9922b6dc13fe06345a0fe46dd413d", "VeeFriends Iconics"],
            ["0x6cb5c137ed297c74c8dc1f7c669bbd9a60b98c3c", "VeeFriends Mini Drops 2"],
        ]
    },
    {
        name:"NFT Worlds",
        url: "https://www.nftworlds.com/",
        twitter: "TOPIAgg",
        nftCollections: [
            ["0xbd4455da5929d5639ee098abfaa3241e9ae111af", "NFT Worlds"],
        ]
    },
    {
        name:"adidas Originals",
        url: "https://www.adidas.com/Metaverse",
        twitter: "altsbyadidas",
        nftCollections: [
            ["0x28472a58a490c5e09a238847f66a68a47cc76f0f", "adidas Originals Into the Metaverse"],
            ["0x749f5ddf5ab4c1f26f74560a78300563c34b417d", "ALTS by adidas"],
            ["0x455c732fee7b5c3b09531439b598ead4817d5274", "adidas IMPOSSIBLE BOX"],
            ["0xba0c9cf4da821dba98407cc4f9c11f6c7a5f9bbc", "adidas Virtual Gear - Genesis Collection"],
        ]
    },
    {
        name:"Loot (for Adventurers)",
        url: "https://www.lootproject.com",
        twitter: "lootproject",
        nftCollections: [
            ["0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7", "Loot (for Adventurers)"],
            ["0x8bf2f876e2dcd2cae9c3d272f325776c82da366d", "Extension Loot (for Adventurers)"],
            ["0xec43a2546625c4c82d905503bc83e66262f0ef84", "LootRock (for adventurers)"],
            ["0x7afe30cb3e53dba6801aa0ea647a0ecea7cbe18d", "Realms (for Adventurers)"],
            ["0xb8a51862964f77025abb65e2c6a39ee8070c8ed4", "The Eye (for Adventurers)"],
            ["0x7403ac30de7309a0bf019cda8eec034a5507cbb3", "Characters  (for Adventurers)"],
        ]
    },
    {
        name:"Pudgy Penguins",
        url: "https://pudgypenguins.com",
        twitter: "pudgypenguins",
        nftCollections: [
            ["0xbd3531da5cf5857e7cfaa92426877b022e612cf8", "Pudgy Penguins"],
        ]
    },
    {
        name:"Murakami",
        url: "https://murakamiflowers.kaikaikiki.com/",
        twitter: "",
        nftCollections: [
            ["0x341a1c534248966c4b6afad165b98daed4b964ef", "Murakami Flowers Seed"],
            ["0x7d8820fa92eb1584636f4f5b8515b5476b75171a", "Murakami.Flowers Official"],
            ["0xdedf88899d7c9025f19c6c9f188deb98d49cd760", "Murakami Lucky Cat Coin Bank"],
            ["0x3e84607606b25f8a3c75b6db4a8a6683d1e40284", "Murakami Flowers Coin"],
        ]
    },
]