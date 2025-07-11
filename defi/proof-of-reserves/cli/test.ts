import { IPoRAdapter } from '../types';
import fs from 'fs';
import path from 'path';

// usage
// ts-node cli/test.ts project-slug
// ex: ts-node cli/test.ts lombard

const projectArgv = process.argv[2];

const projects: Array<string> = [];
if (projectArgv === 'allProtocols') {
  const items = fs.readdirSync(path.join(__dirname, '..', 'adapters'));
  for (const item of items) {
    let adapterName = item;
    if (item.includes('.ts')) {
      adapterName = item.split('.ts')[0];
    }

    projects.push(adapterName);
  }
} else {
  projects.push(projectArgv);
}

(async function (){
  for (const project of projects) {
    let adapter: IPoRAdapter | null = null;
  
    try {
      const adapterFile = path.join('..', 'adapters', project);
      adapter = (await import(adapterFile)).default;
    } catch(e: any) {
      console.log(`adapter ${project} not found`);
      process.exit(0);
    }
  
    if (adapter) {
      console.log('')
      console.info(`🦙 Checking ${project.toUpperCase()} assets & reserves 🦙`)
      console.info(`---------------------------------------------------`)
      console.log('')
  
      try {
        const totalMinted = await adapter.minted({});
        const totalReserves = await adapter.reserves();
        const backingRatio = totalReserves / totalMinted * 100;
  
        console.log(`${'Backing:'.padEnd(10)} ${(backingRatio).toFixed(4)}% - ${backingRatio >= 100 ? '✅ GOOD' : backingRatio >= 98 ? '🆗 OKAY' : '❌ BAD'}`);
        console.log(`${'Minted (USD):'.padEnd(10)} ${totalMinted}`);
        console.log(`${'Reserves (USD):'.padEnd(10)} ${totalReserves}`);
        console.log('');
      } catch(e: any) {
        console.log(e)
      }
    }
  }

  process.exit(0);
})()
 