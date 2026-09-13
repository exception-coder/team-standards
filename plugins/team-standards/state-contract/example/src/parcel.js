exports.create = () => ({ state: 'READY' });
exports.dispatch = parcel => parcel.state === 'READY';
exports.withdraw = parcel => ({ ...parcel, state: 'WITHDRAWN' });
