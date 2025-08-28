const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
process.env.IS_NOT_SCRIPT_MODE = 'TRUE'
process.env.UI_TOOL_MODE = 'TRUE'

const WS = require('ws');
const { spawn, } = require('child_process');

import { dimensionFormChoices, removeWaitingRecords, runDimensionsRefill, sendWaitingRecords, storeAllWaitingRecords } from './dimensions'
import { runMiscCommand } from './misc';
import { runTvlAction, tvlProtocolList, tvlStoreAllWaitingRecords, removeTvlStoreWaitingRecords, sendTvlStoreWaitingRecords, sendTvlDeleteWaitingRecords, tvlDeleteClearList, tvlDeleteSelectedRecords, tvlDeleteAllRecords, } from './tvl'

import { setConfig } from './utils/config';
import getTvlCacheEnv from '../../src/api2/env';

async function start() {
  await setConfig()

  const isProductionMode = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

  try {
    getTvlCacheEnv();
  } catch (error) {
    console.error("Error loading environment variables:", error);
  }


  const AUTH_PASSWORD = process.env.WS_AUTH_PASSWORD;


  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  })

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  })

  let wss: any, reactApp: any, server: any;

  function startDevWebServer() {

    wss = new WS.Server({ port: 8080 });

    console.log(`WebSocket server running on port ${wss.options.port}`);
    // Start the React app
    console.log('Opening tool on the browser... (click here if it does not open automatically: http://localhost:5001)');
    const npmPath = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const reactAppPath = path.resolve(__dirname, '..');

    try {

      // Start React with specific port and environment
      reactApp = spawn(npmPath, ['run', 'start-react'], {
        cwd: reactAppPath,
        env: {
          ...process.env,
          PORT: 5001
        }
      });
    } catch (error) {
      console.error('Error starting React app:', error);
    }

    wss.on('connection', onWebSocketConnection)

  }

  function startProdWebServer() {
    console.log('Starting production web server...');
    const express = require('express');
    const http = require('http');
    const WebSocket = require('ws');
    const app = express();
    const buildRootDir = path.resolve(__dirname, '../build');

    // Serve React static files
    app.use(express.static(buildRootDir));

    // For any other route, serve index.html (for React Router)
    // app.get('*', (_req: any, res: any) => {
    //   res.sendFile(path.join(buildRootDir, 'index.html'));
    // });

    // Create HTTP server
    server = http.createServer(app);

    // Attach WebSocket server to the same HTTP server
    wss = new WebSocket.Server({ server });

    wss.on('connection', onWebSocketConnection);

    // Start server
    server.listen(5001, () => {
      console.log(`Server listening on 5001`);
    });
  }

  async function restartServer() {
    if (!isProductionMode) {
      console.log('Not in production mode, skipping restart');
      return;
    }
    console.log('Restarting server...');
    process.exit(0); // Exit the current process to trigger the restart script
  }

  // Graceful shutdown handler
  const shutdown = (signal: string) => {
    console.log(`\n\n🛑 Received ${signal}. Shutting down gracefully...`);
    console.log('- Closing WebSocket server');
    if (wss)
      wss.close();
    console.log('- Stopping React app');
    if (reactApp)
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

  const onAuthentication = (ws: any) => {
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
        case 'restart-server':
          restartServer();
          break;


        case 'misc-runCommand':
          runMiscCommand(ws, data.data);
          break;

        default: console.error('Unknown message type:', data.type); break;
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  }


  const onWebSocketConnection = (ws: any) => {
    let authenticated = false;

    // Add authentication middleware if password is set
    if (AUTH_PASSWORD) {
      ws.on('message', (message: string) => {
        if (authenticated) return;
        console.log('auth check')


        const data = JSON.parse(message);
        if (data.type === 'authenticate') {
          const auth = data.password;
          if (auth === AUTH_PASSWORD) {
            authenticated = true;
            onAuthentication(ws);
            return;
          }
        }

        console.error('Unauthorized connection attempt');
        ws.close(4001, 'Unauthorized');
      });
    } else
      onAuthentication(ws);
  }

  console.log('Starting server in', isProductionMode ? 'production' : 'development', 'mode');

  if (isProductionMode)
    startProdWebServer();
  else
    startDevWebServer();

}

start()