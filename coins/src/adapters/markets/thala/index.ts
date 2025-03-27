import fetch from "node-fetch";
import getWrites from "../../utils/getWrites";
import { Write } from "../../utils/dbInterfaces";

export async function mod(timestamp: number = 0): Promise<Write[]> {
    const response = await fetch(`https://rpc.ankr.com/http/aptos/v1/view`, {
        method: "POST",
        body: JSON.stringify({
            function: "092e95ed77b5ac815d3fbc2227e76db238339e9ca43ace45031ec2589bea5b8c::oracle::get_price",
            type_arguments: ["0x6f986d146e4a90b828d8c12c14b6f4e003fdff11a8eecceceb63744363eaac01::mod_coin::MOD"],
            arguments: [],
        }),
    }).then((res) => res.json());

    const price = fp64ToFloat(BigInt(response[0].v))

    const pricesObject: any = {
        [`0x6f986d146e4a90b828d8c12c14b6f4e003fdff11a8eecceceb63744363eaac01::mod_coin::MOD`]: {
            underlying: `0x6f986d146e4a90b828d8c12c14b6f4e003fdff11a8eecceceb63744363eaac01::mod_coin::MOD`,
            price,
            symbol: "MOD",
            decimals: 8,
        },
    };

    return getWrites({
        chain: "aptos",
        timestamp,
        pricesObject,
        projectName: "MOD",
    });
}

const ZERO = BigInt(0);
const ONE = BigInt(1);

const fp64ToFloat = (a: bigint): number => {
    // avoid large number
    let mask = BigInt("0xffffffff000000000000000000000000");
    if ((a & mask) != ZERO) {
        throw new Error("too large");
    }

    // integer part
    mask = BigInt("0x10000000000000000");
    let base = 1;
    let result = 0;
    for (let i = 0; i < 32; ++i) {
        if ((a & mask) != ZERO) {
            result += base;
        }
        base *= 2;
        mask = mask << ONE;
    }

    // fractional part
    mask = BigInt("0x8000000000000000");
    base = 0.5;
    for (let i = 0; i < 32; ++i) {
        if ((a & mask) != ZERO) {
            result += base;
        }
        base /= 2;
        mask = mask >> ONE;
    }
    return result;
};
