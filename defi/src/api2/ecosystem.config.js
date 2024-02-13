// https://pm2.keymetrics.io/docs/usage/application-declaration/
module.exports = {
  apps: [
    {
      name: 'api2-rest-server',
      script: './src/api2/index.ts', // Path to your main TypeScript file
      interpreter: 'node',
      args: '-r ts-node/register', // Use ts-node for running TypeScript files
      listen_timeout: "120s", // Wait 60 seconds for the app to start
      kill_timeout: "10s", // Wait 10 seconds for the app to start
      wait_ready: true, // Wait for the 'ready' signal
      instances: 2,
      max_restarts: 3,
      min_uptime: "60s", // The process must stay up for at least 10 seconds before it's considered a normal start
      exp_backoff_restart_delay: 100,
      exec_mode: 'cluster', // Start in cluster mode
      env: {
        TS_NODE_TRANSPILE_ONLY: 'true', // Enable ts-node's transpile-only mode, setting it via args is not working for some reason
      },
    },
  ],
};