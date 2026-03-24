import type { Protocol } from "../protocols/data";

export const sluggifyString = (name: string) => name.toLowerCase().split(" ").join("-").split("'").join("");
export default (prot: Protocol) => sluggifyString(prot.name)

export const sluggifyCategoryString = (category: string) => category.toLowerCase().split(" ").join("-").split("'").join("").split(",").join("").split("(").join("").split(")").join("");
