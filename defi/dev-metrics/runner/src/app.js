const { spawn } = require('child_process');
const cron = require('node-cron');

// run every hour
cron.schedule('0 * * * *', pullRepoCode)
cron.schedule('5 * * * *', updateAppData)
cron.schedule('6 * * * *', downloadGitTomlFile)

// run every 12 hours
cron.schedule('10 */12 * * *', updateGithubData)

// run every 3rd day
cron.schedule('0 11 */3 * *', updateTwitterData)
cron.schedule('55 2 */3 * *', createMappingFromElectricRepo)

function updateTwitterData() {
  return runNpmCommand({ name: 'Updating twitter data', script: `update-twitter` })
}

function updateGithubData() {
  return runNpmCommand({ name: 'Updating github data', script: `update-github` })
}

function createMappingFromElectricRepo() {
  return runNpmCommand({ name: 'Updating twitter data', script: `get-electric-mapping` })
}

function downloadGitTomlFile() {
  return runNpmCommand({ name: 'Download git toml file', script: `download-git-toml` })
}

function updateAppData() {
  return runNpmCommand({ name: 'Updating data mapping for twitter & github', script: `update-dev-mapping` })
}

function pullRepoCode() {
  const repoUrl = 'https://github.com/DefiLlama/defillama-server'
  return spawnPromise({
    name: 'Pull repo code',
    bashCode: `
      [ ! -d "repo" ] && git clone  --depth 1 ${repoUrl} repo
      echo $(pwd)
      cd repo
      git checkout master
      git pull
      cd defi
      npm uninstall @defillama/emissions-adapters
      npm i
      # npm update @defillama/sdk
      cd dev-metrics
      npm i
      git stash
    `
  })
}

async function onStart() {
  console.log('Starting the app...');
  await pullRepoCode()
  await updateAppData()
  await downloadGitTomlFile()
}

onStart()

async function spawnPromise({ bashCode, name }) {
  console.log('[Start]', name)
  return new Promise((resolve, reject) => {
    const childProcess = spawn('bash', ['-c', bashCode], { stdio: 'inherit' });

    childProcess.on('close', (code) => {
      console.log('[Done] ', name)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Child process exited with code ${code}`));
      }
    });

    /* childProcess.on('error', (error) => {
      reject(error);
    }); */
  });
}

async function runNpmCommand({ script, name }) {
  return spawnPromise({
    name,
    bashCode: `
      cd repo/defi/dev-metrics
      time npm run ${script}
    `
  })
}