const assert = require('node:assert/strict');
const parcel = require('./src/parcel');
const current = parcel.create();
if (process.argv[2] === 'lifecycle') assert.equal(parcel.dispatch(current), true);
else if (process.argv[2] === 'negative') assert.equal(parcel.dispatch(parcel.withdraw(current)), false);
else throw new Error('Unknown scenario');
