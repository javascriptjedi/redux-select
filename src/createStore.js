import isPlainObject from './utils/isPlainObject'

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
export var ActionTypes = {
  INIT: '@@redux/INIT'
}

import combineReducers from './combineReducers';
import { createSelector } from 'reselect';

const FUNCTION_SIGNATURE_REGEX = /function\s?\(([^\)]*)/;
const COMMA_SPACE_REGEX = /,\s/g;
const extractArgumentNamesFromFunction = fn => {
	const stringMatch = fn.toString().replace(COMMA_SPACE_REGEX, ',').match(FUNCTION_SIGNATURE_REGEX);

	return stringMatch.length > 1 ? stringMatch[1].split(',') : [];
};

const createStore = (reducer, initialState) => {
	let isDispatching = false;
	let pendingDispatches = [];
	let currentState = initialState;
	let reducerObject = {};
	const initialReducer = currentState;
	let currentReducer = reducer || initialReducer;

	const getState = () => currentState;

	let listeners = [];
	const triggerListeners = () => {
		listeners.slice().forEach(listener => listener());
	};
	const subscribe = (listener) => {
		listeners.push(listener);
		let isSubscribed = true;

		const unsubscribe = () => {
			if (!isSubscribed) {
				return;
			}

			isSubscribed = false;
			const index = listeners.indexOf(listener);
			listeners.splice(index, 1);
		};

		return unsubscribe;
	};

	let selectors = {};
	const getSelectorByName = name => selectors[name];
	const useSelectors = selectorNames => selectorNames.reduce(
		( accumulator, selectorName ) => {
			accumulator.push(selectors[selectorName]);

			return accumulator;
		},
		[]
	);
	const addReducerSelector = reducerName => {
		if (selectors[reducerName] === undefined) {
			selectors[reducerName] = state => state[reducerName];
		}
	};
	const addSelector = ( newSelectorName, selectorNamesArray, selectorFunction ) => {
		//if you don't provide a selector function we do a straight pass through
		//creating an object where the keys are the selector names and the values
		//are the result of calling the selector function (reselect passing the
		//values in)

		if (!selectorFunction) {
			selectorFunction = ( ...selectorValues ) => (
				selectorNamesArray.reduce(
					( accumulator, selectorName, index ) => {
						accumulator[selectorName] = selectorValues[index];

						return accumulator;
					},
					{}
				)
			);
		}

		//TODO temporary fix, this is to handle race conditions where the selector is registering before the reducers have been added
		selectorNamesArray.forEach(addReducerSelector);

		selectors[newSelectorName] = createSelector(
			useSelectors(selectorNamesArray),
			selectorFunction
		);

		return selectors[newSelectorName];
	};
	const addSelectors = newSelectors => {
		Object.keys(newSelectors).forEach(
			selectorName => addSelector.apply(null, [selectorName, ...newSelectors[selectorName]])
		);
	};

	//TODO we could run into a problem here if we swap stores while an async dispatch is happening
	const addReducers = newReducers => {
		const initialStateForNewReducers = Object.keys(newReducers).reduce(( state, reducerName) => {
			state[reducerName] = newReducers[reducerName]();
			addReducerSelector(reducerName);
			return state;
		}, {});

		reducerObject = { ...newReducers, ...reducerObject };

		currentReducer = combineReducers(reducerObject);
		currentState = { ...initialStateForNewReducers, ...currentState };

		if (pendingDispatches.length) {
			pendingDispatches.forEach(action => dispatch(action));
			pendingDispatches.length = 0;//TODO could replay these against reducers that get added later?
		}

		triggerListeners();
	};

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
    currentReducer = nextReducer;
    dispatch({ type: ActionTypes.INIT })
  }

	const dispatch = (action) => {
		if (!isPlainObject(action)) {
			throw new Error(
				'Actions must be plain objects. ' +
				'Use custom middleware for async actions.'
			);
		}

		if (typeof action.type === 'undefined') {
			throw new Error(
				'Actions may not have an undefined "type" property. ' +
				'Have you misspelled a constant?'
			);
		}

		if (isDispatching) {
			throw new Error('Reducers may not dispatch actions.');
		}

		if (currentReducer === initialReducer) {
			pendingDispatches.push(action);
			return;
		}

		try {
			isDispatching = true;
			currentState = currentReducer(currentState, action);
		} finally {
			isDispatching = false;
		}

		listeners.slice().forEach(listener => listener());
		return action;
	};

	//this should really only be called by tests
	const reset = () => {
		reducerObject = {};
		selectors = {};
		currentReducer = initialReducer;
		currentState = {};
	};

	dispatch({ type: ActionTypes.INIT })

	return {
		getState,
		dispatch,
		subscribe,
		addReducers,
		replaceReducer,
		addSelector,
		getSelectorByName,
		reset
	};
};

export default createStore;
