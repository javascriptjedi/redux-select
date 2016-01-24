'use strict';

module.exports = {
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
    library: 'Redux',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['', '.js']
  }
};
