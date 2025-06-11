import { IPoRAdapter } from '../types';

// usage
// ts-node cli/test.ts project-slug
// ex: ts-node cli/test.ts lombard-lbtc

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
      const [mintedBalances, unreleasedBalances] = await Promise.all([
        adapter.minted({timestamp: timestamp}),
        adapter.unrelaesed({timestamp: timestamp}),
      ])
      for (const [token, balance] of Object.entries(mintedBalances)) {
        const backingRatio = unreleasedBalances[token] / balance * 100;
        console.log(`${'Minted:'.padEnd(15)} ${balance} ${token}`);
        console.log(`${'Unreleased:'.padEnd(15)} ${unreleasedBalances[token]} ${token}`);
        console.log(`${'Backing Ratio:'.padEnd(15)} ${(backingRatio).toFixed(4)}% - ${backingRatio >= 100 ? '✅ GOOD' : '❌ BAD'}`);
        console.log('');
      }
    } catch(e: any) {
      console.log(e)
    }
  }
})()
 