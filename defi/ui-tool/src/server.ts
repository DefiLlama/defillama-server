
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
})

import { dimensionFormChoices, removeWaitingRecords, runDimensionsRefill, sendWaitingRecords, storeAllWaitingRecords } from './dimensions'

const WS = require('ws');
const { spawn } = require('child_process');

const wss = new WS.Server({ port: 8080 });

console.log('WebSocket server running on port 8080');


// Start the React app
console.log('Opening tool on the browser... (click here if it does not open automatically: http://localhost:5001)');
const npmPath = process.platform === 'win32' ? 'npm.cmd' : 'npm';
if (process.platform === 'win32') {
  spawn(npmPath, ['run', 'start'], { cwd: __dirname, windowsVerbatimArguments: true, shell: true });
} else {
  spawn(npmPath, ['run', 'start'], { cwd: __dirname });
}

const originalConsoleLog = console.log
const originalConsoleError = console.error

wss.on('connection', (ws: any) => {
  console.log('Client connected');

  ws.send(JSON.stringify({
    type: 'init',
    data: { dimensionFormChoices }
  }));
  sendWaitingRecords(ws);

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
      default: console.error('Unknown message type:', data.type); break;
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});