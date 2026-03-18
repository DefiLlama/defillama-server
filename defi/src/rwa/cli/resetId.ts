import { initPG, DAILY_RWA_DATA } from "../db";

const id = '202'

async function main() {
    console.log(`Resetting defiactivetvl and aggregatedactivemcap for id: ${id}`);

    await initPG();

    const [affectedRows] = await DAILY_RWA_DATA.update(
        {
            defiactivetvl: JSON.stringify({}),
            aggregatedefiactivetvl: 0,
            updated_at: new Date(),
        },
        {
            where: {
                id: id,
            },
        }
    );

    console.log(`Updated ${affectedRows} record(s) for id: ${id}`);
    process.exit();
}

main().catch((e) => {
    console.error(`Error resetting`, e);
    process.exit(1);
}); // ts-node defi/src/rwa/resetId.ts