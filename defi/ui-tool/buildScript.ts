import { execSync } from "child_process";
import { createCombinedHash, readHashFromFile, writeHashToFile } from "../src/adaptors/utils";

console.time('build app.js')

async function run() {
  const dataHash = createCombinedHash([__dirname + '/src/App.js']);
  const lastHash = readHashFromFile('ui-tool.app.js');
  if (dataHash === lastHash) {
    console.log('No changes in app.js, skipping build');
    return;
  }

  execSync(
    'GENERATE_SOURCEMAP=false INLINE_RUNTIME_CHUNK=false TSC_COMPILE_ON_ERROR=true DISABLE_ESLINT_PLUGIN=true react-scripts build',
    { cwd: __dirname, stdio: 'pipe' }
  )

  writeHashToFile('ui-tool.app.js', dataHash);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
}).then(() => {
  console.timeEnd('build app.js')
  process.exit(0);
})