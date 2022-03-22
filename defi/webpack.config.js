const slsw = require('serverless-webpack-fixed');
const path = require('path');
const nodeExternals = require('webpack-node-externals');

/*
const binaryDirs = ['.bin'];
function isNotBinary(x) {
  return !utils.contains(binaryDirs, x);
}
const nodeModules = utils.readDir(modulesDir).filter(isNotBinary);
*/

const ext = nodeExternals()

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        include: path.resolve(__dirname, "src"),
        exclude: [
          /node_modules/,
          /DefiLlama-Adapters/
        ],
      },
      {
        test: /\.js$/,
        include: __dirname,
        exclude: [
          /node_modules/,
          /DefiLlama-Adapters/
        ],
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.mjs$/,
        resolve: { mainFields: ["default"] }
      }
    ],
  },
  externals: [(...args) => {
    const [arg1, arg2, arg3] = args;
    let context = arg1;
    let request = arg2;
    let callback = arg3;
    // in case of webpack 5
    if (arg1 && arg1.context && arg1.request) {
      context = arg1.context;
      request = arg1.request;
      callback = arg2;
    }
    if(context.includes("@defillama/adapters/projects")){
      callback(null, "commonjs" + ' ' + request);
      return;
    }
    return ext(...args);
  }],
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      'bignumber.js$': 'bignumber.js/bignumber.js',
      'node-fetch$': 'node-fetch/lib/index.js'
    }
  }
};
