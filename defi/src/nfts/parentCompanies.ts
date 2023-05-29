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
    }
]