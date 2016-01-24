import React from 'react';
import connect from './connect';

const mapSelectorsAndDispatchToProps = (selectorNames, mapDispatchToProps) => {
  if (selectorNames) {
    const selectorName = `returnSelectorObject:${selectorNames.join('-')}`;

    const mapSelectorsToProps = store.getSelectorByName(selectorName) || store.addSelector(selectorName, selectorNames);

    return connect(mapSelectorsToProps, mapDispatchToProps);
  } else {
    return connect(null, mapDispatchToProps);
  }
};

export default mapSelectorsAndDispatchToProps;
