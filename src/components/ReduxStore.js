import React, { Children } from 'react';
import Provider from './Provider';
import store from '../store';

const ReduxStore = ({ children }) => <Provider store={store}>{ Children.only(children) }</Provider>;

export default ReduxStore;
