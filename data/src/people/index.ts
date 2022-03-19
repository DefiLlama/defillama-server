export interface Person {
  id: string;
  formattedName: string;
  akaNames: string|null;
  profile_pic: string;
  anon: boolean;
  associatedProtocols: string[];
  associatedChains: string[];
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  bio: string | null;
  roles: {
    [role:string]: string[]
  };
  q_and_a: string[] | null;
}



export default [
  {
    id: "1",
    formattedName: "Andre Cronje",
    akaNames: null,
    profile_pic: `andre_cronje.png`,
    anon: false,
    associatedProtocols: ["yearn-finance", "keep3r-network"],
    associatedChains: ["fantom"], //should we go by different id (coingecko or else?) there in case the chain or protocol is not listed on defillama but may be listed on a llama service in the future
    twitter: "@andrecronjetech",
    telegram: "@andrecronje",
    website: null,
    bio: "Lorem ipsum",
    roles: {
      "Founder": ["yearn-finance", "keep3r-network"]
    },
    q_and_a: null,
    //achievements? //known for? //active since?  //other associated products??? like podcasts
  },
  {
    id: "2",
    formattedName: "Jordan Fish",
    akaNames: "cobie",
    profile_pic: `jordan_fish.png`,
    anon: false,
    associatedProtocols: ["lido"],
    associatedChains: null,
    twitter: "@cobie",
    telegram: null,
    website: null,
    bio: "Lorem ipsum",
    roles: {
      "Co-founder": ["lido"]
    },
    q_and_a: null
  },
  {
    id: "3",
    formattedName: "Vitalik Buterin",
    akaNames: null,
    profile_pic: `vitalik_buterin.png`,
    anon: false,
    associatedProtocols: null,
    associatedChains: ["Ethereum"],
    twitter: "VitalikButerin",
    telegram: null,
    website: "https://vitalik.ca/",
    bio: "Lorem ipsum",
    roles: {
      "Co-founder": ["Ethereum"]
    },
    q_and_a: null
  },
  {
      id: "4",
      formattedName: "Michael Egorov",
      akaNames: null,
      profile_pic: `michael_egorov.png`,  
      anon: false,
      associatedProtocols: ["Curve"],
      associatedChains: null,
      twitter: "newmichwill",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Curve"]
      },
      q_and_a: null
    },
    {
      id: "5",
      formattedName: "Robert Leshner",
      akaNames: null,
      profile_pic: `robert_leshner.png`,  
      anon: false,
      associatedProtocols: ["Compound"],
      associatedChains: null,
      twitter: "rleshner",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["Compound"]
      },
      q_and_a: null
    },
    {
      id: "6",
      formattedName: "Stani Kulechov",
      akaNames: null,
      profile_pic: `stani_kulechov.png`,  
      anon: false,
      associatedProtocols: ["Aave", "Lens Protocol"],
      associatedChains: null,
      twitter: "StaniKulechov",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["Aave", "Lens Protocol"]
      },
      q_and_a: null
    },
    {
      id: "7",
      formattedName: "Do Kwon",
      akaNames: null,
      profile_pic: `do_kwon.png`,  
      anon: false,
      associatedProtocols: ["Anchor", "Astroport", "Mirror"],
      associatedChains: ["Terra"],
      twitter: "stablekwon",
      telegram: null,
      website: null,
      bio: "null",
      roles: {
        "Co-founder": ["Terra", "Anchor", "Astroport", "Mirror"]
      },
      q_and_a: null
    },
    {
      id: "8",
      formattedName: "Hayden Adams",
      akaNames: null,
      profile_pic: `hayden_adams.png`,  
      anon: false,
      associatedProtocols: ["Uniswap"],
      associatedChains: null,
      twitter: "haydenzadams",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["Uniswap"]
      },
      q_and_a: null
    },
    {
      id: "9",
      formattedName: "Zhaojun",
      akaNames: null,
      profile_pic: `zhaojun.png`,  
      anon: false,
      associatedProtocols: ["Multichain"],
      associatedChains: null,
      twitter: "zhaojun_sh",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Multichain"]
      },
      q_and_a: null
    },
    {
      id: "10",
      formattedName: "Sowmay Jain",
      akaNames: null,
      profile_pic: `sowmay_jain.png`,  
      anon: false,
      associatedProtocols: ["Instadapp"],
      associatedChains: null,
      twitter: "sowmay_jain",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Instadapp"]
      },
      q_and_a: null
    },
    {
      id: "11",
      formattedName: "Samyak Jain",
      akaNames: null,
      profile_pic: `samyak_jain.png`,  
      anon: false,
      associatedProtocols: ["Instadapp"],
      associatedChains: null,
      twitter: "smykjain",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Instadapp"]
      },
      q_and_a: null
    },
    {
      id: "12",
      formattedName: "Ramin Erfani",
      akaNames: null,
      profile_pic: `ramin_erfani.png`,  
      anon: false,
      associatedProtocols: ["SushiSwap"],
      associatedChains: null,
      twitter: "chillichelli",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Core-developer": ["SushiSwap"]
      },
      q_and_a: null
    },
    {
      id: "13",
      formattedName: "Matthew Lilley",
      akaNames: null,
      profile_pic: `matthew_lilley.png`,  
      anon: false,
      associatedProtocols: ["SushiSwap"],
      associatedChains: null,
      twitter: "MatthewLilley",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Interim-CTO": ["SushiSwap"]
      },
      q_and_a: null
    },
    {
      id: "14",
      formattedName: "0xnori",
      akaNames: null,
      profile_pic: `0xnori.png`,  
      anon: true,
      associatedProtocols: ["ShushiSwap"],
      associatedChains: null,
      twitter: "0xnori",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Security": ["SushiSwap"]
      },
      q_and_a: null
    },
    {
      id: "15",
      formattedName: "Banteg",
      akaNames: "Artem",
      profile_pic: `banteg.png`,  
      anon: true,
      associatedProtocols: ["Yearn Finance"],
      associatedChains: null,
      twitter: "bantg",
      telegram: null,
      website: "github.com/banteg",
      bio: null,
      roles: {
        "Lead-developer": ["Yearn Finance"]
      },
      q_and_a: null
    },
    {
      id: "16",
      formattedName: "Fernando Martinelli",
      akaNames: null,
      profile_pic: `fernando_martinelli.png`,  
      anon: false,
      associatedProtocols: ["Balancer"],
      associatedChains: null,
      twitter: "fcmartinelli",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Balancer"]
      },
      q_and_a: null
    },
    {
      id: "17",
      formattedName: "Daniele Sestagalli",
      akaNames: "Daniele Sesta",
      profile_pic: `daniele_sesta.png`,  
      anon: false,
      associatedProtocols: ["Abracadabra", "Wonderland", "Popsicle Finance"],
      associatedChains: null,
      twitter: "danielesesta",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Abracadabra", "Wonderland", "Popsicle Finance"]
      },
      q_and_a: null
    },
    {
      id: "18",
      formattedName: "0xMerlin",
      akaNames: null,
      profile_pic: `0xmerlin.png`,  
      anon: true,
      associatedProtocols: ["Abracadabra"],
      associatedChains: null,
      twitter: "0xM3rlin",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Abracadabra"]
      },
      q_and_a: null
    },
        {
      id: "19",
      formattedName: "Squirrel",
      akaNames: null,
      profile_pic: `squirrel.png`,  
      anon: true,
      associatedProtocols: ["Abracadabra"],
      associatedChains: null,
      twitter: "squirrelcrypto",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Abracadabra"]
      },
      q_and_a: null
    },
    {
      id: "20",
      formattedName: "Sam Kazemian",
      akaNames: null,
      profile_pic: `sam_kazemian.png`,  
      anon: false,
      associatedProtocols: ["Frax"],
      associatedChains: null,
      twitter: "samkazemian",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["Frax"]
      },
      q_and_a: null
    },
    {
      id: "21",
      formattedName: "0xmurloc",
      akaNames: null,
      profile_pic: `0xmurloc.png`,  
      anon: true,
      associatedProtocols: ["Trader Joe"],
      associatedChains: null,
      twitter: "0xmurloc",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Trader-Joe"]
      },
      q_and_a: null
    },
    {
      id: "22",
      formattedName: "cryptofish",
      akaNames: null,
      profile_pic: `cryptofish.png`,  
      anon: true,
      associatedProtocols: ["Trader-Joe"],
      associatedChains: null,
      twitter: "cryptofishx",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Trader Joe"]
      },
      q_and_a: null
    },
    {
      id: "23",
      formattedName: "Robert Lauko",
      akaNames: null,
      profile_pic: `robert_lauko.png`,  
      anon: false,
      associatedProtocols: ["Liquity"],
      associatedChains: null,
      twitter: "robert_lauko",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["Liquity"]
      },
      q_and_a: null
    },
    {
      id: "24",
      formattedName: "Michael Svoboda",
      akaNames: null,
      profile_pic: `michael_svoboda.png`,  
      anon: false,
      associatedProtocols: ["Liquity"],
      associatedChains: null,
      twitter: "svobodamichael",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "COO": ["Liquity"]
      },
      q_and_a: null
    },
    {
      id: "25",
      formattedName: "Josh Lee",
      akaNames: null,
      profile_pic: `joshlee.png`,  
      anon: false,
      associatedProtocols: ["Osmosis"],
      associatedChains: null,
      twitter: "dogemos",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Osmosis"]
      },
      q_and_a: null
    },
    {
      id: "26",
      formattedName: "Sunny Aggarwal",
      akaNames: null,
      profile_pic: `sunnyaggarwal.png`,  
      anon: false,
      associatedProtocols: ["Osmosis"],
      associatedChains: null,
      twitter: "sunnya97",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Osmosis"]
      },
      q_and_a: null
    },
    {
      id: "27",
      formattedName: "Loong Wang",
      akaNames: null,
      profile_pic: `loong_wang.png`,  
      anon: false,
      associatedProtocols: ["RenVM"],
      associatedChains: null,
      twitter: "bzlwang",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["RenVM"]
      },
      q_and_a: null
    },
    {
      id: "28",
      formattedName: "Eerie",
      akaNames: null,
      profile_pic: `eerie.png`,  
      anon: true,
      associatedProtocols: ["SpookySwap"],
      associatedChains: null,
      twitter: "EerieEight",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["SpookySwap"]
      },
      q_and_a: null
    },
    {
      id: "29",
      formattedName: "ooGwei",
      akaNames: null,
      profile_pic: `oogwei.png`,  
      anon: true,
      associatedProtocols: ["SpookySwap"],
      associatedChains: null,
      twitter: "The_ooGwei",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["SpookySwap"]
      },
      q_and_a: null
    },
    {
      id: "30",
      formattedName: "Jeffrey Huang",
      akaNames: null,
      profile_pic: `jeffreyhuang.png`,  
      anon: false,
      associatedProtocols: ["CREAM Finance", "Iron Bank"],
      associatedChains: null,
      twitter: null,
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["CREAM Finance", "Iron Bank"]
      },
      q_and_a: null
    },
    {
      id: "31",
      formattedName: "Guy Ben-Artzi",
      akaNames: null,
      profile_pic: `guybenartzi.png`,  
      anon: false,
      associatedProtocols: ["Bancor"],
      associatedChains: null,
      twitter: "benartzi",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Bancor"]
      },
      q_and_a: null
    },
    {
      id: "32",
      formattedName: "JD Gagnon",
      akaNames: null,
      profile_pic: `jdgagnon.png`,  
      anon: false,
      associatedProtocols: ["Benqi"],
      associatedChains: null,
      twitter: "benqinomics",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Benqi"]
      },
      q_and_a: null
    },
    {
      id: "33",
      formattedName: "Galia Benartzi",
      akaNames: null,
      profile_pic: `galiabenartzi.png`,  
      anon: false,
      associatedProtocols: ["Bancor"],
      associatedChains: null,
      twitter: "galiabenartzi",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Bancor"]
      },
      q_and_a: null
    },
    {
      id: "34",
      formattedName: "Eyal Hertzog",
      akaNames: null,
      profile_pic: `eyalhertzog.png`,  
      anon: false,
      associatedProtocols: ["Bancor"],
      associatedChains: null,
      twitter: "eyal",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Bancor"]
      },
      q_and_a: null
    },
    {
      id: "35",
      formattedName: "Antonio Juliano",
      akaNames: null,
      profile_pic: `antoniojuliano.png`,  
      anon: false,
      associatedProtocols: ["dYdX"],
      associatedChains: null,
      twitter: "AntonioMJuliano",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["dYdX"]
      },
      q_and_a: null
    },
    {
      id: "36",
      formattedName: "Kain Warwick",
      akaNames: null,
      profile_pic: `kainwarwick.png`,  
      anon: false,
      associatedProtocols: ["Synthetix"],
      associatedChains: null,
      twitter: "kaiynne",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["Synthetix"]
      },
      q_and_a: null
    },
    {
      id: "37",
      formattedName: "Socrates0x",
      akaNames: null,
      profile_pic: `socrates0x.png`,  
      anon: true,
      associatedProtocols: ["Synapse"],
      associatedChains: null,
      twitter: "Socrates0x",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Synapse", "Nerve"]
      },
      q_and_a: null
    },
    {
      id: "38",
      formattedName: "Aurelius",
      akaNames: null,
      profile_pic: `aurelius.png`,  
      anon: false,
      associatedProtocols: ["Synapse", "Nerve"],
      associatedChains: null,
      twitter: "AureliusBTC",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Synapse", "Nerve"]
      },
      q_and_a: null
    },
    {
      id: "39",
      formattedName: "Carson Cook",
      akaNames: "Liquidity Lizard",
      profile_pic: `carsoncook`,  
      anon: false,
      associatedProtocols: ["Tokemak"],
      associatedChains: null,
      twitter: "LiquidityWizard",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["Tokemak"]
      },
      q_and_a: null
    },
    {
      id: "40",
      formattedName: "Scoopy Trouples",
      akaNames: null,
      profile_pic: `scoopytrouples.png`,  
      anon: true,
      associatedProtocols: ["Alchemix"],
      associatedChains: null,
      twitter: "scupytrooples",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Alchemix"]
      },
      q_and_a: null
    },
    {
      id: "41",
      formattedName: "Snape",
      akaNames: null,
      profile_pic: `snape.png`,  
      anon: true,
      associatedProtocols: ["Alchemix"],
      associatedChains: null,
      twitter: "snape88",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Alchemix"]
      },
      q_and_a: null
    },
    {
      id: "42",
      formattedName: "Techno",
      akaNames: "veTechno",
      profile_pic: `vetechno.png`,  
      anon: true,
      associatedProtocols: ["Alchemix"],
      associatedChains: null,
      twitter: "thetechn0cratic",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Alchemix"]
      },
      q_and_a: null
    },
    {
      id: "43",
      formattedName: "0xDerivadev",
      akaNames: null,
      profile_pic: `0xderivadev.png`,  
      anon: true,
      associatedProtocols: ["Alchemix"],
      associatedChains: null,
      twitter: "derivative_dr",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Alchemix"]
      },
      q_and_a: null
    },
    {
      id: "44",
      formattedName: "0xScream",
      akaNames: null,
      profile_pic: `0xscream.png`,  
      anon: true,
      associatedProtocols: ["Scream"],
      associatedChains: null,
      twitter: "0xScream",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Founder": ["Scream"]
      },
      q_and_a: null
    },
    {
      id: "45",
      formattedName: "Tascha Punyaneramitdee",
      akaNames: null,
      profile_pic: `tascha.png`,  
      anon: false,
      associatedProtocols: ["Alpha Finance"],
      associatedChains: null,
      twitter: "tascha_panpan",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Alpha Finance"]
      },
      q_and_a: null
    },
    {
      id: "46",
      formattedName: "Tyler Spalding",
      akaNames: null,
      profile_pic: `tylerspalding.png`,  
      anon: false,
      associatedProtocols: ["Flexa"],
      associatedChains: null,
      twitter: "trspalding",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Flexa"]
      },
      q_and_a: null
    },
    {
      id: "47",
      formattedName: "Daniel C. McCabe",
      akaNames: null,
      profile_pic: `danielmccabe.png`,  
      anon: false,
      associatedProtocols: ["Flexa"],
      associatedChains: null,
      twitter: null,
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Flexa"]
      },
      q_and_a: null
    },
    {
      id: "48",
      formattedName: "Trevor Filter",
      akaNames: null,
      profile_pic: `trevorfilter.png`,  
      anon: false,
      associatedProtocols: ["Flexa"],
      associatedChains: null,
      twitter: "trev",
      telegram: null,
      website: "https://trevorfilter.com/",
      bio: null,
      roles: {
        "Co-founder": ["Flexa"]
      },
      q_and_a: null
    },
    {
      id: "49",
      formattedName: "Zachary Kilgore",
      akaNames: null,
      profile_pic: `zacharykilgore.png`,  
      anon: false,
      associatedProtocols: ["Flexa"],
      associatedChains: null,
      twitter: "zkilgore",
      telegram: null,
      website: "https://zacharykilgore.com/",
      bio: null,
      roles: {
        "Co-founder": ["Flexa"]
      },
      q_and_a: null
    },
    {
      id: "50",
      formattedName: "Sam Bankman-Fried",
      akaNames: "SBF",
      profile_pic: `sambankmanfried.png`,  
      anon: false,
      associatedProtocols: ["Serum"],
      associatedChains: null,
      twitter: "SBF_FTX",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["FTX", "Serum"]
      },
      q_and_a: null
    },
    {
      id: "51",
      formattedName: "Chris Spadafora",
      akaNames: "Spadaboom",
      profile_pic: `chrisspadafora.png`,  
      anon: false,
      associatedProtocols: ["Badger DAO"],
      associatedChains: null,
      twitter: "spadaboom1",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Badger DAO"]
      },
      q_and_a: null
    },
    {
      id: "52",
      formattedName: "Aaveen Huijari",
      akaNames: null,
      profile_pic: `aaveenhuijari.png`,  
      anon: true,
      associatedProtocols: ["Geist Finance"],
      associatedChains: null,
      twitter: "AaveenHuijari",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Geist Finance"]
      },
      q_and_a: null
    },
    {
      id: "53",
      formattedName: "Jai Bhavnani",
      akaNames: null,
      profile_pic: `jaibhavnani.png`,  
      anon: false,
      associatedProtocols: ["Rari Capital"],
      associatedChains: null,
      twitter: "jai_bhavnani",
      telegram: null,
      website: "http://jbhav.com/",
      bio: null,
      roles: {
        "Co-founder": ["Rari Capital"]
      },
      q_and_a: null
    },
    {
      id: "54",
      formattedName: "David Lucid",
      akaNames: null,
      profile_pic: `davidlucid.png`,  
      anon: false,
      associatedProtocols: ["Rari Capital"],
      associatedChains: null,
      twitter: "davidslucid",
      telegram: null,
      website: null,
      bio: null,
      roles: {
        "Co-founder": ["Rari Capital"]
      },
      q_and_a: null
    },
] as Person[]
