import { baseIconsUrl } from "../constants";
import treasuries from "./treasury";

const entities = [
    {
        id: "1",
        name: "a16z",
        url: "https://a16z.com/",
        description: "Investor",
        logo: "a16z.png",
        category: "VC",
        module: "entities/animoca-brands.js",
        twitter: "a16z"
    },
].map(entity=>({
    ...entity,
    id: `entity-${entity.id}`,
    logo: `${baseIconsUrl}/${entity.logo}`,
    symbol: "", chain: "", gecko_id:null, cmcId:null, chains:[]
}))

export default entities;
export const treasuriesAndEntities = treasuries.concat(entities)