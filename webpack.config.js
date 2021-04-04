const slsw = require('serverless-webpack');

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  externals:['ethers'],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        include: __dirname,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.mjs$/,
        resolve: { mainFields: [ "default" ] }
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      'bignumber.js$': 'bignumber.js/bignumber.js',
      'node-fetch$': 'node-fetch/lib/index.js'
    }
  },
  optimization: {
    // fix node modules not packaged into zip
    concatenateModules: false
  },
};
