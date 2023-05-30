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
    }
]