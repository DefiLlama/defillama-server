import { getApi } from "../../utils/sdk";
import getWrites from "../../utils/getWrites";
import { getConnection } from "../../solana/utils";
import { PublicKey } from "@solana/web3.js";

const BufferLayout = require("buffer-layout");

// Helper for u64
const u64 = (property: string) => {
    const layout = BufferLayout.blob(8, property);
    const _decode = layout.decode.bind(layout);
    layout.decode = (buffer: Buffer, offset: number) => {
        const data = _decode(buffer, offset);
        return BigInt(
            '0x' + [...data].reverse().map(i => i.toString(16).padStart(2, '0')).join('')
        );
    };
    return layout;
};

// Simplified stake pool layout
const STAKE_POOL_PARTIAL_LAYOUT = BufferLayout.struct([
    BufferLayout.u8('accountType'),           // 1 byte
    BufferLayout.blob(32, 'manager'),         // 32 bytes
    BufferLayout.blob(32, 'staker'),          // 32 bytes
    BufferLayout.blob(32, 'stakeDepositAuthority'), // 32 bytes
    BufferLayout.u8('stakeWithdrawBumpSeed'), // 1 byte
    BufferLayout.blob(32, 'validatorList'),   // 32 bytes
    BufferLayout.blob(32, 'reserveStake'),    // 32 bytes
    BufferLayout.blob(32, 'poolMint'),        // 32 bytes
    BufferLayout.blob(32, 'managerFeeAccount'), // 32 bytes
    BufferLayout.blob(32, 'tokenProgramId'),  // 32 bytes
    u64('totalLamports'),                     // 8 bytes 
    u64('poolTokenSupply'),                   // 8 bytes 
]);

function decodeStakePool(accountInfo: { data: Buffer }) {
    const buffer = Buffer.from(accountInfo.data);
    return STAKE_POOL_PARTIAL_LAYOUT.decode(buffer);
}

// LST (Liquid Staking Token) configurations
// These tokens have exchange rates > 1 with underlying FOGO
const LST_CONFIGS = {
    // iFOGO from Ignition
    'iFoGoY5nMWpuMJogR7xjUAWDJtygHDF17zREeP4MKuD': {
        name: 'iFOGO',
        stakePool: 'ign1zuR3YsvLVsEu8WzsyazBA8EVWUxPPHKnhqhoSTB',
    },
    // stFOGO from Brasa
    'Brasa3xzkSC9XqMBEcN9v53x4oMkpb1nQwfaGMyJE88b': {
        name: 'stFOGO',
        stakePool: '4z6piA8DWGfbZge1xkwtkczpZEMsgReNh5AsCKZUQE9X',
    },
};

// Get exchange rate from a stake pool: totalLamports / poolTokenSupply
async function getStakePoolExchangeRate(connection, stakePoolAddress) {
    const pubkey = new PublicKey(stakePoolAddress);
    const accountInfo = await connection.getAccountInfo(pubkey);

    const decoded = decodeStakePool(accountInfo);
    const totalLamports = Number(decoded.totalLamports);
    const poolTokenSupply = Number(decoded.poolTokenSupply);

    return totalLamports / poolTokenSupply;
}

export async function valiant(timestamp: number) {
    const chain = "fogo";
    const api = await getApi(chain, timestamp);
    const connection = getConnection(api.chain);

    // Fetch LST exchange rates
    const pricesObject: any = {};
    for (const [mint, config] of Object.entries(LST_CONFIGS)) {
        const exchangeRate = await getStakePoolExchangeRate(connection, config.stakePool);

        pricesObject[mint] = {
            underlying: "So11111111111111111111111111111111111111112", // native fogo
            symbol: config.name,
            decimals: 9,
            price: exchangeRate,
        };
    }

    return getWrites({
        chain,
        timestamp,
        pricesObject,
        projectName: "valiant",
    });
}