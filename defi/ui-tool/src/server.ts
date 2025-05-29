import { dimensionFormChoices, removeWaitingRecords, runDimensionsRefill, sendWaitingRecords, storeAllWaitingRecords } from './dimensions'
const path = require('path');
const WS = require('ws');
const { spawn } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

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
  console.log('- Stopping React app');
  reactApp.kill();
  console.log('- Closing WebSocket server');
  wss.close();
  console.log('✅ Cleanup complete\n');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

reactApp.stdout.on('data', (data: Buffer) => {
  console.log(data.toString());
});

reactApp.stderr.on('data', (data: Buffer) => {
  console.error(data.toString());
});

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