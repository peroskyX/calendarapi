const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
    channelId: { type: String, required: true, index: true },
    userId: { type: String, required: true, unique: true },
    resourceId: { type: String, required: true },
    expiration: { type: Number, required: true },
    syncToken: String,
});

const Webhook = mongoose.model('Webhook', webhookSchema);

module.exports = Webhook;
