const { spawn } = require('child_process');
const cron = require('node-cron');

// Schedule a cron job to run the task every hour
cron.schedule('0 * * * *', pullRepoCode)
cron.schedule('5 * * * *', updateAppData)

// Pull the latest code from the repo
function pullRepoCode() {
  console.log('Pulling Repo code...');

  // Replace with your GitHub repository URL
  const repoUrl = 'https://github.com/DefiLlama/defillama-server'

  const bashCode = `
  [ ! -d "repo" ] && git clone  --depth 1 ${repoUrl} repo
  echo $(pwd)
  cd repo
  git checkout master
  git pull
  cd defi
  npm uninstall @defillama/emissions-adapters @defillama/dimension-adapters
  npm i
  # npm update @defillama/sdk
  cd dev-metrics
  npm i
  git stash
  `

  const childProcess = spawn('bash', ['-c', bashCode], { stdio: 'inherit' });

  childProcess.on('close', (code) => {
    console.log(`Repo code pulled, exiting with code: ${code}`);
  })
}

function updateAppData() {
  console.log('Updating data mapping for twitter & github...');

  const bashCode = `
  cd repo/defi/dev-metrics
  npm run update-dev-mapping
  `

  const childProcess = spawn('bash', ['-c', bashCode], { stdio: 'inherit' });

  childProcess.on('close', (code) => {
    console.log(`Repo code pulled, exiting with code: ${code}`);
  })
}

function onStart() {
  console.log('Starting the app...');
  pullRepoCode()
  updateAppData()
}

onStart()