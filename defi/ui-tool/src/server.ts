process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
})

import { dimensionFormChoices } from './dimensions'

const WS = require('ws');
const { spawn } = require('child_process');

const wss = new WS.Server({ port: 8080 });

console.log('WebSocket server running on port 8080');


// Start the React app
// const npmPath = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// spawn(npmPath, ['run', 'start'], { cwd: __dirname });

const originalConsoleLog = console.log
const originalConsoleError = console.error

wss.on('connection', (ws: any) => {
  console.log('Client connected');

  ws.send(JSON.stringify({
    type: 'init',
    data: { dimensionFormChoices }
  }));

  // start streaming logs to the client
  const wrappedLog = (...args: any) => {
    ws.send(JSON.stringify({
      type: 'output',
      content: args.map((arg: any) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
    }));
    originalConsoleLog(...args);
  }
  const wrappedError = (...args: any) => {
    ws.send(JSON.stringify({
      type: 'error',
      content: args.map((arg: any) => {
      if (arg instanceof Error) {
        return `Error: ${arg.message}\nStack: ${arg.stack}`;
      }
      return typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2);
      }).join(' ')
    }));
    originalConsoleError(...args);
  }

  console.log = wrappedLog
  console.error = wrappedError

 ws.on('message', (message: any) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'runCommand':
        console.log('Running command:', data);
        break;
      default: console.error('Unknown message type:', data.type); break;
    }

    /* if (data.type === 'runCommand') {
      const env = {
        AWS_REGION: 'eu-central-1',
        tableName: 'prod-table',
        type: data.adapterType,
        protocol: data.protocol,
        from: data.dateFrom,
        to: data.dateTo,
        dry_run: data.dryRun ? 'true' : 'false',
        refill_only_missing_data: data.onlyMissing ? 'true' : 'false',
        parallel_count: data.parallelCount,
        ...process.env
      };

      const npmPath = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const subProcess = spawn(npmPath, ['run', 'fillOld-dimensions'], { env, });

      subProcess.stdout.on('data', (data: any) => {
        ws.send(JSON.stringify({
          type: 'output',
          content: data.toString()
        }));
      });

      subProcess.stderr.on('data', (data: any) => {
        ws.send(JSON.stringify({
          type: 'output',
          content: `ERROR: ${data.toString()}`
        }));
      });

      subProcess.on('close', (code: any) => {
        ws.send(JSON.stringify({
          type: 'output',
          content: `Process exited with code ${code}`
        }));
        ws.send(JSON.stringify({
          type: 'done'
        }));
      });
    } */
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});