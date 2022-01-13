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
  }
] as Person[]