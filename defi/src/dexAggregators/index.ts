import * as odos from "./odos";
import * as matcha from "./0x";
import * as inch from "./1inch";
import * as cowswap from "./cowswap";
import * as kyberswap from "./kyberswap";
import * as openocean from "./openocean";
import * as lifi from "./lifi";
import * as paraswap from "./paraswap";
import * as rango from "./rango";

export const allDexAggregators = [matcha, inch, cowswap, kyberswap, openocean, paraswap, lifi, rango, odos];
