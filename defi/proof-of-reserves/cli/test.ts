import { IPoRAdapter } from '../types';

// usage
// ts-node cli/test.ts project-slug
// ex: ts-node cli/test.ts lombard

const project = process.argv[2];

let timestamp = Math.floor((new Date().getTime()) / 1000);
if (process.argv[3]) {
  try {
    timestamp = Math.floor((new Date(process.argv[3]).getTime()) / 1000);
    if (isNaN(timestamp)) {
      throw Error('invalid timestamp');
    }
  } catch(e: any) {
    console.log(`invalid timestamp ${process.argv[3]} was given`);
    process.exit(0);
  }
}

(async function (){
  let adapter: IPoRAdapter | null = null;

  try {
    const adapterFile = `../adapters/${project}`;
    adapter = (await import(adapterFile)).default;
  } catch(e: any) {
    console.log(`adapter ${project} not found`);
    process.exit(0);
  }

  if (adapter) {
    console.log('')
    console.info(`🦙 Running ${project.toUpperCase()} adapter 🦙`)
    console.info(`---------------------------------------------------`)
    console.log('')

    try {
      const result = await adapter.reserves({timestamp: timestamp});

      console.log('');
      console.log(`----- Asset: ${adapter.assetLabel} -----`);

      let totalMinted = 0;
      let totalReserves = 0;
      for (const [chain, chainBalance] of Object.entries(result)) {
        let chainTotalMinted = 0;
        let chainTotalReserves = 0;
        for (const balance of Object.values(chainBalance.minted.getBalances())) {
          totalMinted += Number(balance);
          chainTotalMinted += Number(balance);
        }
        for (const balance of Object.values(chainBalance.reserves.getBalances())) {
          totalReserves += Number(balance);
          chainTotalReserves += Number(balance);
        }
        console.log('');
        console.log(chain);
        console.log(`\t${'Minted:'.padEnd(10)} ${chainTotalMinted}`);
        console.log(`\t${'Reserves:'.padEnd(10)} ${chainTotalReserves}`);
      }

      const backingRatio = totalReserves / totalMinted * 100;

      console.log('');
      console.log('----- Summarize -----');
      console.log(`${'Backing:'.padEnd(10)} ${(backingRatio).toFixed(4)}% - ${backingRatio >= 100 ? '✅ GOOD' : '❌ BAD'}`);
      console.log(`${'Minted:'.padEnd(10)} ${totalMinted}`);
      console.log(`${'Reserves:'.padEnd(10)} ${totalReserves}`);
      console.log('');
    } catch(e: any) {
      console.log(e)
    }
  }
})()
 