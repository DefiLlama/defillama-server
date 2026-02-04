
import { Program } from "@project-serum/anchor";
import { getProvider } from "../utils";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";


const solProgramId = "CRSeeBqjDnm3UPefJ9gxrtngTsnQRhEJiTA345Q83X3v";
const usdcProgramId = "1avaAUcjccXCjSZzwUvB2gS3DzkkieV2Mw8CjdN65uu";

const edgeCaseTimestamps = [
  { start: 1713880000, end: 1713885480 }, // 10:32 AM - 10:58 AM ET on April 23, 2024
  { start: 1713874500, end: 1713876060 }, // 8:15 AM - 8:41 AM ET on April 23, 2024
];


function getPositionFilters() {
  const sizeFilter = { dataSize: 178 };
  const value = BigInt(9999);
  const valueBuffer = Buffer.alloc(8);
  valueBuffer.writeBigUInt64LE(value, 0);
  const val0Filter = {
    memcmp: {
      offset: 40,
      bytes: bs58.encode(Buffer.from(new Uint8Array(8))),
    },
  }
  const val9999Filter = {
    memcmp: {
      offset: 40,
      bytes: bs58.encode(valueBuffer),
    },
  }
  return [
    [sizeFilter, val0Filter],
    [sizeFilter, val9999Filter],
  ]
}

function isWithinEdgeCaseTimeRange(closeTimestamp: any) {
  return edgeCaseTimestamps.some(
    ({ start, end }) => closeTimestamp >= start && closeTimestamp <= end
  );
}

export async function getLavaTokens() {
  const provider = getProvider();
  const tokenSet = new Set<string>();
  for (const programId of [solProgramId, usdcProgramId]) {
    const program = new Program(lavarageIDL as any, programId, provider);
    const pools = await program.account.pool.all()
    const poolMap = {} as any
    pools.forEach((pool: any) => {
      poolMap[pool.publicKey.toBase58()] = pool.account.collateralType.toBase58()
    })
    for (const filter of getPositionFilters()) {
      const positions = await program.account.position.all(filter)
      positions.forEach(({ account }: any) => {
        let { closeStatusRecallTimestamp, pool, collateralAmount, timestamp } = account
        const token = poolMap[pool.toBase58()]
        const closeTS = closeStatusRecallTimestamp.toNumber()
        const ts = timestamp.toNumber()
        if ((closeTS && !isWithinEdgeCaseTimeRange(ts)) || !token) return;
        if (+collateralAmount.toString() === 0) return;
        tokenSet.add(token)
      })
    }
  }
  
  return Array.from(tokenSet)
}


const lavarageIDL = {
  version: "0.1.0",
  name: "lavarage",
  instructions: [],
  accounts: [
    {
      name: "pool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "interestRate",
            type: "u8",
          },
          {
            name: "collateralType",
            type: "publicKey",
          },
          {
            name: "maxBorrow",
            type: "u64",
          },
          {
            name: "nodeWallet",
            type: "publicKey",
          },
          {
            name: "maxExposure",
            type: "u64",
          },
          {
            name: "currentExposure",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "position",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "publicKey",
          },
          {
            name: "closeStatusRecallTimestamp",
            type: "u64",
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "userPaid",
            type: "u64",
          },
          {
            name: "collateralAmount",
            type: "u64",
          },
          {
            name: "timestamp",
            type: "i64",
          },
          {
            name: "trader",
            type: "publicKey",
          },
          {
            name: "seed",
            type: "publicKey",
          },
          {
            name: "closeTimestamp",
            type: "i64",
          },
          {
            name: "closingPositionSize",
            type: "u64",
          },
          {
            name: "interestRate",
            type: "u8",
          },
          {
            name: "lastInterestCollect",
            type: "i64",
          },
        ],
      },
    },
  ],
  types: [],
  events: [],
  errors: [],
};
