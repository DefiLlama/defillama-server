// https://pm2.keymetrics.io/docs/usage/application-declaration/
module.exports = {
  apps: [
    {
      name: "ui-tool",
      script: "./ui-tool/src/server.ts", // Path to your main TypeScript file
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      env: {
        TS_NODE_TRANSPILE_ONLY: 'true', // Enable ts-node's transpile-only mode, setting it via args is not working for some reason
        NODE_ENV: "production",
      },
      args: '-r ts-node/register', // Use ts-node for running TypeScript files
      node_args: "--max-old-space-size=10240", // Set memory limit to 10GB
    },
  ],
};