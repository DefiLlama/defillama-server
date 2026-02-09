import { initPG, fetchMetadataPG, DAILY_RWA_DATA, HOURLY_RWA_DATA } from "../db";

async function main() {
    console.log('Finding RWA IDs with activeMcapData = false...');

    await initPG();

    // Fetch all metadata
    const metadata = await fetchMetadataPG();
    console.log(`Fetched metadata for ${metadata.length} RWA assets`);

    // Find IDs where activeMcapData is false
    const idsToReset: string[] = [];
    metadata.forEach((m: any) => {
        if (m.data && m.data.activeMcapData === false) {
            idsToReset.push(m.id);
        }
    });

    console.log(`Found ${idsToReset.length} IDs with activeMcapData = false:`);
    console.log(idsToReset);

    if (idsToReset.length === 0) {
        console.log('No IDs to reset. Exiting.');
        process.exit();
    }

    // Update DAILY_RWA_DATA for all found IDs
    console.log('\nUpdating DAILY_RWA_DATA...');
    const [dailyAffectedRows] = await DAILY_RWA_DATA.update(
        {
            activemcap: JSON.stringify({}),
            aggregatedactivemcap: 0,
            updated_at: new Date(),
        },
        {
            where: {
                id: idsToReset,
            },
        }
    );

    console.log(`Updated ${dailyAffectedRows} record(s) in DAILY_RWA_DATA`);

    // Update HOURLY_RWA_DATA for all found IDs
    console.log('\nUpdating HOURLY_RWA_DATA...');
    const [hourlyAffectedRows] = await HOURLY_RWA_DATA.update(
        {
            activemcap: JSON.stringify({}),
            aggregatedactivemcap: 0,
            updated_at: new Date(),
        },
        {
            where: {
                id: idsToReset,
            },
        }
    );

    console.log(`Updated ${hourlyAffectedRows} record(s) in HOURLY_RWA_DATA`);

    console.log(`\nCompleted! Reset activemcap and aggregatedactivemcap for ${idsToReset.length} IDs across all timestamps.`);
}

main().catch((e) => {
    console.error(`Error resetting activeMcap:`, e);
}); // ts-node defi/src/rwa/resetActiveMcap.ts
