module.exports = {
  apps: [
    {
      name: 'api2-rest-server',
      script: './src/api2/index.ts', // Path to your main TypeScript file
      interpreter: 'node',
      args: '-r ts-node/register', // Use ts-node for running TypeScript files
      listen_timeout: 120000, // Wait 60 seconds for the app to start
      kill_timeout: 120000, // Wait 60 seconds for the app to start
      wait_ready: true, // Wait for the 'ready' signal
      instances: 3,
      exec_mode: 'cluster', // Start in cluster mode
    },
  ],
};