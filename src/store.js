import thunk from 'redux-thunk'
import createStore from './createStore'
import applyMiddleware from './applyMiddleware';

const createStoreWithMiddleware = applyMiddleware(thunk)(createStore);

export default createStoreWithMiddleware();
