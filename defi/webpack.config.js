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
  externals: [nodeExternals()],
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      'bignumber.js$': 'bignumber.js/bignumber.js',
      'node-fetch$': 'node-fetch/lib/index.js'
    }
  }
};
