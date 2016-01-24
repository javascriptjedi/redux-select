'use strict';

exports.__esModule = true;
exports['default'] = wrapActionCreators;

var _bindActionCreators = require('../bindActionCreators');

function wrapActionCreators(actionCreators) {
  return function (dispatch) {
    return _bindActionCreators(actionCreators, dispatch);
  };
}

module.exports = exports['default'];
