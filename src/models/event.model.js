const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Google Calendar event ID
    userId: { type: String, required: true, index: true },
    summary: String,
    description: String,
    status: String,
    startDateTime: { type: Date, index: true },
    endDateTime: { type: Date, index: true },
    created: Date,
    updated: Date,
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
