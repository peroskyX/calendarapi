const mongoose = require('mongoose');

const fetchedRangeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
});

const FetchedRange = mongoose.model('FetchedRange', fetchedRangeSchema);

module.exports = FetchedRange;
