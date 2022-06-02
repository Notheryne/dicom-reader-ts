import _ from 'lodash';

const getMultiString = (value: string) => {
  const valueSplit = _.split(value, '\\');
  return valueSplit.length === 1 ? valueSplit[0] : valueSplit;
};

const handleMultiString = (value: string | string[], callback: CallableFunction) => {
  if (_.isString(value)) {
    return callback(value);
  }
  return _.map(value, callback)
}

export {getMultiString, handleMultiString}
