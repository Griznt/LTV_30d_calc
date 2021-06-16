const moment = require('moment');
const request = require('bluebird').promisifyAll(require('request'), { multiArgs: true });

const fixerUrl = 'http://data.fixer.io/api/';

const ACCESS_KEY = 'fd267810aba734c3cf72f50c30bf1662';

export default function convertCurrency(value = 1, currencyFrom, currencyTo, day)  {
  const formatedDay = (!day) ? '' : `&date=${moment(day).format('YYYY-MM-DD')}`;

  return new Promise((resolve, reject) => request.getAsync(`${fixerUrl}/convert?access_key=${ACCESS_KEY}&base=${currencyFrom}${formatedDay}`).then((response) => {
    const parsedResponse = JSON.parse(response[1]);

    if (typeof value !== 'number') reject(new Error('Value to convert is NaN.'));
    if (parsedResponse.error === 'Invalid base') {
      reject(new Error('Invalid currency base.'));
    } else if (!Object.keys(parsedResponse.rates).includes(currencyTo)) {
      reject(new Error('Invalid currency to convert.'));
    }

    const rateFrom = parsedResponse.rates[currencyTo];
    const convertedValue = value * rateFrom;
    resolve({
      currencyFrom,
      currencyTo,
      value,
      convertedValue
    });
  }));
};
