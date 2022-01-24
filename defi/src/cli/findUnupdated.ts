import findOutdated from '../utils/findOutdated'

const maxDrift = 3 * 3600; // Max three updates missed

async function main() {
  console.log(await findOutdated(maxDrift))
}
main();
