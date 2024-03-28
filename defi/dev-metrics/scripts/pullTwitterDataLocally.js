const { spawn } = require('child_process');

let isRunning = false;

function runCommand() {
  if (!isRunning) {
    isRunning = true;
    const start = +new Date()
    const bash_script = `
      cd ${__dirname}/..
      npm run update-dev-mapping
      npm run update-twitter
    `
    console.log('Start pulling data');
    const childProcess = spawn('bash', ['-c', bash_script], { stdio: 'inherit' });

    childProcess.on('close', (code) => {
      const runTime = ((+(new Date) - start) / 1e3).toFixed(1)
      console.log(`[Done] runtime: ${runTime}s  `)
      isRunning = false;
    })

  }
}

// Initial run
runCommand();

// Schedule the command to run every 30 minutes
const interval = 2 * 60 * 60 * 1000; // 30 minutes in milliseconds - assuming the IP is ratelimited for 30 minutes
setInterval(runCommand, interval);
