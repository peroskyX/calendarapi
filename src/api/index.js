const express = require('express');
const { getEvents } = require('./events.controller');
const { handleNotification } = require('./notifications.controller');
const { setupWebhook } = require('./webhook.controller');

const router = express.Router();

// Define the routes
router.get('/events', getEvents);
router.post('/notifications', handleNotification);
router.post('/setup-webhook', setupWebhook);

module.exports = router;
