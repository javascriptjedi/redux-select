import isPlainObject from 'lodash/isPlainObject'
import assign from 'lodash/assign'
import { createSelector } from 'reselect'
import combineReducers from './combineReducers'

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
export var ActionTypes = {
  INIT: '@@redux/INIT'
}

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [initialState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} enhancer The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
export default function createStore(reducer, initialState, enhancer) {
  if (typeof initialState === 'function' && typeof enhancer === 'undefined') {
    enhancer = initialState
    initialState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createStore)(reducer, initialState)
  }

  var pendingDispatches = []
  var currentState = initialState
  var reducerObject = {}
  var initialReducer = currentState
  var currentReducer = reducer || initialReducer
  var currentListeners = []
  var nextListeners = currentListeners
  var isDispatching = false

  function triggerListeners() {
    var listenersToCall = nextListeners.slice()

    listenersToCall.forEach(listener => listener())
  }

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    var isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      var index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  var selectors = {}
  /**
   * Retrieves a selector function from the internal selector registry
   *
   * @param {String} name The name of the selector
   * @returns {Function} The selector function
   */
  function getSelectorByName(name) { return selectors[name] }

  function useSelectors(selectorNames) {
    return selectorNames.reduce(function ( accumulator, selectorName ) {
      accumulator.push(selectors[selectorName])

      return accumulator
    }, [])
  }

  function addReducerSelector(reducerName) {
    if (selectors[reducerName] === undefined) {
      selectors[reducerName] = state => state[reducerName]
    }
  }


  function addSelector( newSelectorName, selectorNamesArray, selectorFunction ) {
    //if you don't provide a selector function we do a straight pass through
    //creating an object where the keys are the selector names and the values
    //are the result of calling the selector function (reselect passing the
    //values in)

    if (!selectorFunction) {
      selectorFunction = function () {
        var selectorValues = Array.prototype.slice.call(null, arguments)
        selectorNamesArray.reduce(function ( accumulator, selectorName, index ) {
          accumulator[selectorName] = selectorValues[index]

          return accumulator
        }, {})
      }
    }

    //TODO temporary fix, this is to handle race conditions where the selector is registering before the reducers have been added
    selectorNamesArray.forEach(addReducerSelector)

    selectors[newSelectorName] = createSelector(
      useSelectors(selectorNamesArray),
      selectorFunction
    )

    return selectors[newSelectorName]
  }

  //TODO array foreach support
  //TODO we could run into a problem here if we swap stores while an async dispatch is happening
  function addReducers( newReducers ) {
    var initialStateForNewReducers = Object.keys(newReducers).reduce(function ( state, reducerName) {
      state[reducerName] = newReducers[reducerName]()
      addReducerSelector(reducerName)
      return state
    }, {})

    reducerObject = assign(assign({}, newReducers), reducerObject)

    currentReducer = combineReducers(reducerObject)
    currentState = assign(assign({}, initialStateForNewReducers), currentState)

    if (pendingDispatches.length) {
      pendingDispatches.forEach(function (action) { dispatch(action) })
      pendingDispatches.length = 0//TODO could replay these against reducers that get added later?
    }

    triggerListeners()
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
        'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
        'Have you misspelled a constant?'
      )
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    if (currentReducer === initialReducer) {
      pendingDispatches.push(action)
      return
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    var listeners = currentListeners = nextListeners
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]()
    }

    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.INIT })
  }

   //this should really only be called by tests
  function reset() {
    reducerObject = {}
    selectors = {}
    currentReducer = initialReducer
    currentState = {}
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT })

  return {
    addReducers,
    addSelector,
    dispatch,
    getSelectorByName,
    subscribe,
    getState,
    replaceReducer,
    reset
  }
}
