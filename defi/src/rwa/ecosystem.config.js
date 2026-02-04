// PM2 Configuration for RWA REST Server
// https://pm2.keymetrics.io/docs/usage/application-declaration/
module.exports = {
    apps: [
        {
            name: 'rwa-rest-server',
            script: './src/rwa/server.ts',
            interpreter: 'node',
            args: '-r ts-node/register',
            node_args: '--max-old-space-size=4096',
            listen_timeout: 60_000,
            kill_timeout: 10_000,
            wait_ready: true,
            instances: 3,
            exec_mode: 'cluster',
            env: {
                TS_NODE_TRANSPILE_ONLY: 'true',
            },
        },
    ],
};
