'use strict';

var reactExternal = {
  root: 'React',
  commonjs2: 'react',
  commonjs: 'react',
  amd: 'react'
};

module.exports = {
  externals: {
    'react': reactExternal
  },
  module: {
    loaders: [
      {
        test: /\.js(x)?$/,
        loader: 'babel-loader',
        query: {
          stage: 0
        },
        exclude: /node_modules/
      }
    ]
  },
  output: {
    library: 'Redux-Select',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['', '.js']
  }
};
