// https://pm2.keymetrics.io/docs/usage/application-declaration/
module.exports = {
  apps: [
    {
      name: 'api2-rest-server',
      script: './src/api2/index.ts', // Path to your main TypeScript file
      interpreter: 'node',
      args: '-r ts-node/register', // Use ts-node for running TypeScript files
      node_args: '--max-old-space-size=5120', // Set the maximum old space size to 5 GB
      listen_timeout: 120_000, // Wait 120 seconds for the app to start
      kill_timeout: 10_000, // Wait 10 seconds for the app to start
      wait_ready: true, // Wait for the 'ready' signal
      instances: 2,
      exec_mode: 'cluster', // Start in cluster mode
      env: {
        TS_NODE_TRANSPILE_ONLY: 'true', // Enable ts-node's transpile-only mode, setting it via args is not working for some reason
      },
    },
  ],
};