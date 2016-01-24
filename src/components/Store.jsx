import React from 'react';
import Provider from './Provider';
import store from '../store.js';

const Store = ({ children }) => <Provider store={store}>{ Children.only(children) }</Provider>;

export default Store;
