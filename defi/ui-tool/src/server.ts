const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

import { dimensionFormChoices, removeWaitingRecords, runDimensionsRefill, sendWaitingRecords, storeAllWaitingRecords } from './dimensions'
import { runTvlAction, tvlProtocolList, tvlStoreAllWaitingRecords, removeTvlStoreWaitingRecords, sendTvlStoreWaitingRecords, sendTvlDeleteWaitingRecords, tvlDeleteClearList, tvlDeleteSelectedRecords, tvlDeleteAllRecords, } from './tvl'
const WS = require('ws');
const { spawn } = require('child_process');


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
})

const wss = new WS.Server({ port: 8080 });

console.log('WebSocket server running on port 8080');

// Start the React app
console.log('Opening tool on the browser... (click here if it does not open automatically: http://localhost:5001)');
const npmPath = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const reactAppPath = path.resolve(__dirname, '..');

// Start React with specific port and environment
const reactApp = spawn(npmPath, ['run', 'start-react'], {
  cwd: reactAppPath,
  env: {
    ...process.env,
    PORT: '5001'
  }
});

// Graceful shutdown handler
const shutdown = (signal: string) => {
  console.log(`\n\n🛑 Received ${signal}. Shutting down gracefully...`);
  console.log('- Closing WebSocket server');
  wss.close();
  console.log('- Stopping React app');
  reactApp.kill();
  console.log('✅ Cleanup complete\n');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const originalConsoleLog = console.log
const originalConsoleError = console.error

function stringify(a: any) {
  try {
    const str = JSON.stringify(a);
    return str
  } catch (e) {
    return a
  }
}

wss.on('connection', (ws: any) => {
  console.log('Client connected');

  ws.send(JSON.stringify({
    type: 'init',
    data: { dimensionFormChoices, tvlProtocolList }
  }));
  sendWaitingRecords(ws);
  sendTvlStoreWaitingRecords(ws);
  sendTvlDeleteWaitingRecords(ws);

  // start streaming logs to the client
  const wrappedLog = (...args: any) => {
    ws.send(JSON.stringify({
      type: 'output',
      content: args.map((arg: any) => (typeof arg === 'string' ? arg : stringify(arg))).join(' ')
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

  ws.on('message', async (message: any) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'dimensions-refill-runCommand':
        runDimensionsRefill(ws, data.data);
        break;
      case 'dimensions-refill-deleteRecords':
        removeWaitingRecords(ws, data.data);
        break;
      case 'dimensions-refill-save-all':
        storeAllWaitingRecords(ws);
        break;
      case 'reload-table':
        sendWaitingRecords(ws);
        break;



      case 'tvl-runCommand':
        runTvlAction(ws, data.data);
        break;
      case 'tvl-refill-save-all':
        tvlStoreAllWaitingRecords(ws);
        break;
      case 'tvl-refill-deleteRecords':
        removeTvlStoreWaitingRecords(ws, data.data);
        break;
      case 'tvl-delete-clear-list':
        tvlDeleteClearList(ws);
        break;
      case 'tvl-delete-delete-records':
        await tvlDeleteSelectedRecords(ws, data.data);
        break;
      case 'tvl-delete-delete-all':
        await tvlDeleteAllRecords(ws);
        break;

      default: console.error('Unknown message type:', data.type); break;
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});